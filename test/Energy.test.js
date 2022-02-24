const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { BigNumber, constants } = require('ethers')
const { expectEqEth, expect1WeiApprox, etherToNumber, expectApproxWeiDecimals } = require('./utils')
const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const Manager = artifacts.require('TutellusManager')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')
const ACPP = artifacts.require('AccessControlProxyPausable')

let myDeployer
let myToken
let myRewardsVault
let myHoldersVault
let myTreasuryVault
let myManager
let myEnergy
let owner, person

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = ethers.utils.id('ENERGY_MANAGER_ROLE')
const ENERGY_ID = ethers.utils.id('ENERGY');
const ONE_ETHER = parseEther('1')
const TWO_ETHER = parseEther('2')
const SIX_ETHER = parseEther('6')
const RAY = parseEther('1000000000')

const SECONDS = 1
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

const getAddresses = async () => {
const addresses = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.clientsVault(),
    myDeployer.holdersVault(),
    myDeployer.treasuryVault()
])
return addresses
}

const setInstances = async (addresses) => {
    [myToken, myRewardsVault, myHoldersVault, myTreasuryVault] = await Promise.all([
        Token.at(addresses[0]),
        RewardsVault.at(addresses[2]),
        HoldersVault.at(addresses[4]),
        TreasuryVault.at(addresses[5]),
    ])
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getCompoundedInterest(
    from,
    to,
    rate
) {
    const seconds = to - from
    const secondsMinusOne = seconds - 1
    const secondsMinusTwo = seconds - 2

    const ratePerSecond = rate.div(SECONDS_PER_YEAR)

    const basePowerTwo = ratePerSecond.mul(ratePerSecond).div(RAY)
    const basePowerThree = basePowerTwo.mul(ratePerSecond).div(RAY)

    const secondTerm = basePowerTwo.mul(seconds * secondsMinusOne).mul(ONE_ETHER).div(TWO_ETHER)
    const thirdTerm = basePowerThree.mul(seconds * secondsMinusOne * secondsMinusTwo).mul(ONE_ETHER).div(SIX_ETHER)

    return ratePerSecond.mul(seconds).add(secondTerm).add(thirdTerm).mul(ONE_ETHER).div(RAY)
}

describe.only('Energy Token', function () {
    before(async () => {
        [owner, person] = await web3.eth.getAccounts()
    })
    beforeEach(async () => {
        const previous = await latestBlock()
        myDeployer = await Deployer.new(owner, previous)
        const addresses = await getAddresses()
        await setInstances(addresses)

        const ids = {   
            ERC20: myToken.address,
            REWARDS_VAULT: myRewardsVault.address,
            HOLDERS_VAULT: myHoldersVault.address,
            TREASURY_VAULT: myTreasuryVault.address
        }
        myManager = await Manager.new()
        await myManager.initialize()

        const keys = Object.keys(ids)

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            const addr = ids[key]
            const myContract = await ACPP.at(addr)

            await myManager.setId(ethers.utils.id(key), addr)
            await myContract.updateManager(myManager.address)
        }
    })

    describe('Deploy', () => {
        it('Deploying energy token', async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            expect(energy).not.eq(ZERO_ADDRESS)
        })
    })
    describe('Mint', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        })
        it('Minting tokens, checking supply after time', async () => {

            const rate = await myEnergy.rate()
            await myEnergy.mint(owner, ONE_ETHER)

            const balance0 = await myEnergy.totalSupply()
            
            await sleep(SECONDS * 1000)  
            await time.advanceBlock()

            const balance1 = await myEnergy.balanceOf(owner)
            const cumulated = balance1.sub(balance0)
            const expCumulated = balance0.mul(getCompoundedInterest(0, SECONDS, rate)).div(ONE_ETHER)
            
            expectApproxWeiDecimals(cumulated, expCumulated, 1)
        })
        it('Minting for two users', async () => {

            const rate = await myEnergy.rate()

            await myEnergy.mint(owner, ONE_ETHER)
            await sleep(SECONDS * 1000) // 2 seconds
            await myEnergy.mint(person, TWO_ETHER)

            const compound0 = (await myEnergy.totalSupply()).sub(ONE_ETHER).sub(TWO_ETHER)

            await sleep(SECONDS * 1000) // 2 seconds
            await time.advanceBlock()

            const interestComp0 = compound0.mul(getCompoundedInterest(0, SECONDS, rate)).div(ONE_ETHER)
            const compound1 = (await myEnergy.totalSupply()).sub(ONE_ETHER).sub(TWO_ETHER).sub(compound0).sub(interestComp0)

            expectApproxWeiDecimals(compound1, compound0.mul(BigNumber.from(ONE_ETHER).add(TWO_ETHER)).div(ONE_ETHER), 1) // three times
        })
        it('Cant mint 0 tokens', async () => {
            await expectRevert(
                myEnergy.mint(owner, '0'),
                'Cant mint 0 tokens'
            ) 
        })
    })
    describe('MintStatic', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        })
        it('Minting tokens', async () => {
            await myEnergy.mintStatic(owner, ONE_ETHER)
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, ONE_ETHER)

        })
        it('Cant mint 0 tokens', async () => {
            await expectRevert(
                myEnergy.mintStatic(owner, '0'),
                'Cant mint 0 tokens'
            ) 
        })
        it('Cant mint to zero address', async () => {
            await expectRevert(
                myEnergy.mintStatic(constants.AddressZero, ONE_ETHER),
                'TutellusEnergy: mint to the zero address'
            ) 
        })
    })
    describe('Burn', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        })
        it('Burning tokens after minting', async () => {

            const rate = await myEnergy.rate()
            await myEnergy.mint(owner, ONE_ETHER)
            const SECONDS = 1

            const balance0 = await myEnergy.totalSupply()
            
            await sleep(SECONDS * 1000)  
            await myEnergy.burn(owner, ONE_ETHER)

            const cumulated = await myEnergy.totalSupply()
            const expCumulated = balance0.mul(getCompoundedInterest(0, SECONDS, rate)).div(ONE_ETHER)
            
            expectApproxWeiDecimals(cumulated, expCumulated, 1)
        })
        it('Burning all', async () => {

            const rate = await myEnergy.rate()
            await myEnergy.mint(owner, ONE_ETHER)
            const SECONDS = 1

            await sleep(SECONDS * 1000)  
            await myEnergy.burnAll(owner)

            const balance1 = await myEnergy.totalSupply()            
            expectEqEth(balance1, 0)
        })
        it('Cant burn 0 tokens', async () => {
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, 0)
            await expectRevert(
                myEnergy.burn(owner, 0),
                'Cant burn 0 tokens'
            )
        })
        it('Cant burn all if no balance', async () => {
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, 0)
            await expectRevert(
                myEnergy.burnAll(owner),
                'Cant burn 0 tokens'
            )
        })
    })
    describe('BurnStatic', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        })
        it('Burning tokens after minting', async () => {
            await myEnergy.mintStatic(owner, ONE_ETHER)
            await myEnergy.burn(owner, ONE_ETHER)
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, 0)
        })
        it('Burning all', async () => {
            await myEnergy.mintStatic(owner, ONE_ETHER)
            await myEnergy.burnAll(owner)
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, 0)
        })
    })
    describe('Rate', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
            await myManager.grantRole(ENERGY_MANAGER_ROLE, owner)
        })
        it('Set rate', async () => {

            const newRate = RAY.mul(SIX_ETHER).div(ONE_ETHER)
            await myEnergy.setRate(newRate) // 6%
            const rate = await myEnergy.rate()
            expectEqEth(rate, newRate)

            const nullSupply = await myEnergy.totalSupply()

            expectEqEth(nullSupply, 0)

            await myEnergy.mint(owner, ONE_ETHER)
            const SECONDS = 1

            const balance0 = await myEnergy.totalSupply()
            
            await sleep(SECONDS * 1000)  
            await time.advanceBlock()

            const balance1 = await myEnergy.totalSupply()
            const cumulated = balance1.sub(balance0)
            const expCumulated = balance0.mul(getCompoundedInterest(0, SECONDS, rate)).div(ONE_ETHER)
            
            expectApproxWeiDecimals(cumulated, expCumulated, 1)
        })
    })
    describe('Scales', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
            await myManager.grantRole(ENERGY_MANAGER_ROLE, owner)
        })
        it('Scale supply', async () => {

            await myEnergy.mint(owner, ONE_ETHER)                                
            await time.advanceBlock()
            
            const [scaledTotalSupply, totalSupply] = await Promise.all([
                myEnergy.scaledTotalSupply(),
                myEnergy.totalSupply()
            ])
            
            const scaled = await myEnergy.scale(totalSupply)
            expectApproxWeiDecimals(scaled, scaledTotalSupply, 1)
        })
        it('Unscale scaled supply', async () => {

            await myEnergy.mint(owner, ONE_ETHER)                                
            await time.advanceBlock()
            
            const [scaledTotalSupply, totalSupply] = await Promise.all([
                myEnergy.scaledTotalSupply(),
                myEnergy.totalSupply()
            ])
            
            const unscaled = await myEnergy.unscale(scaledTotalSupply)
            expectApproxWeiDecimals(totalSupply, unscaled, 1)
        })
    })
})
  