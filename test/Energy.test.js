const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { BigNumber, constants, utils } = require('ethers')
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
let owner, person, person2

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = ethers.utils.id('ENERGY_MANAGER_ROLE')
const ENERGY_ID = ethers.utils.id('ENERGY');
const ONE_ETHER = parseEther('1')
const TWO_ETHER = parseEther('2')
const THREE_ETHER = parseEther('3')
const SIX_ETHER = parseEther('6')
const RAY = parseEther('1000000000')
const RATE = parseEther('0.01')

const eventId = utils.id('myEvent')
const eventId2 = utils.id('myEvent2')
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
const DECIMALS_ERROR = 9

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

// function getCompoundedInterest(
//     from,
//     to,
//     rate
// ) {
//     const seconds = to.sub(from)
//     const secondsMinusOne = seconds.sub(1)
//     const secondsMinusTwo = seconds.sub(2)

//     const ratePerSecond = rate.div(SECONDS_PER_YEAR)

//     const basePowerTwo = ratePerSecond.mul(ratePerSecond).div(RAY)
//     const basePowerThree = basePowerTwo.mul(ratePerSecond).div(RAY)

//     const secondTerm = basePowerTwo.mul(seconds.mul(secondsMinusOne)).mul(ONE_ETHER).div(TWO_ETHER)
//     const thirdTerm = basePowerThree.mul(seconds.mul(secondsMinusOne.mul(secondsMinusTwo))).mul(ONE_ETHER).div(SIX_ETHER)

//     return ratePerSecond.mul(seconds).add(secondTerm).add(thirdTerm).mul(ONE_ETHER).div(RAY)
// }

function getLinearInterest(
    from,
    to,
    rate
) {
    const timeDiff = BigNumber.from(to - from);
    return timeDiff.mul(rate).div(SECONDS_PER_YEAR).mul(ONE_ETHER).div(RAY)
}

const advanceBlockInSeconds = async (seconds) => {
    const latest = BigNumber.from((await time.latest()).toString());
    const timestamp = latest.add(seconds);
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp.toNumber()])
    await time.advanceBlock()
}

describe('Energy Token', function () {
    before(async () => {
        [owner, person, person2] = await web3.eth.getAccounts()
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

            const balance0 = await myEnergy.balanceOf(owner);
            
            await advanceBlockInSeconds(SECONDS_PER_YEAR)

            const balance1 = await myEnergy.balanceOf(owner);
            const diff = balance1.sub(balance0)
            expectApproxWeiDecimals(diff, RATE, DECIMALS_ERROR);
        })
        it('Minting for two users', async () => {

            const rate = await myEnergy.rate()

            await myEnergy.mint(owner, ONE_ETHER)
            await advanceBlockInSeconds(SECONDS_PER_YEAR)
            await myEnergy.mint(person, TWO_ETHER)

            const interest0 = (await myEnergy.totalSupply()).sub(ONE_ETHER).sub(TWO_ETHER)

            await advanceBlockInSeconds(SECONDS_PER_YEAR)

            const interest1 = (await myEnergy.totalSupply()).sub(ONE_ETHER).sub(TWO_ETHER).sub(interest0)

            expectApproxWeiDecimals(interest1, interest0.mul(ONE_ETHER.add(TWO_ETHER)).div(ONE_ETHER), 16) // three times
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

            const balance0 = await myEnergy.totalSupply()
            
            await advanceBlockInSeconds(SECONDS_PER_YEAR)
            await myEnergy.burn(owner, ONE_ETHER)

            const cumulated = await myEnergy.totalSupply()
            const expCumulated = balance0.mul(getLinearInterest(0, SECONDS_PER_YEAR, rate)).div(ONE_ETHER)
            
            expectApproxWeiDecimals(cumulated, expCumulated, DECIMALS_ERROR)
        })
        it('Burning all', async () => {

            const rate = await myEnergy.rate()
            await myEnergy.mint(owner, ONE_ETHER)
            const SECONDS = 1

            await advanceBlockInSeconds(SECONDS)
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
        it('Cant burn more than balance', async () => {
            await expectRevert(
                myEnergy.burn(owner, ONE_ETHER),
                'TutellusEnergy: amount exceeds balance'
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
        it('Burning all with variable', async () => {
            await myEnergy.mint(owner, ONE_ETHER)
            await myEnergy.mintStatic(owner, ONE_ETHER)
            await myEnergy.burnAll(owner)
            const balance = await myEnergy.balanceOf(owner)
            expectEqEth(balance, 0)
        })

        it('Cant burn energy to the zero address', async () => {
            await expectRevert(
                myEnergy.burnStatic(constants.AddressZero, ONE_ETHER),
                'TutellusEnergy: burn from the zero address'
            )
        })

        it('Cant burn amount that exceeds balance', async () => {
            await expectRevert(
                myEnergy.burnStatic(owner, ONE_ETHER),
                'TutellusEnergy: burn amount exceeds balance'
            )
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
            
            await advanceBlockInSeconds(SECONDS)

            const balance1 = await myEnergy.totalSupply()
            const cumulated = balance1.sub(balance0)
            const expCumulated = balance0.mul(getLinearInterest(0, SECONDS, rate)).div(ONE_ETHER)
            
            expectApproxWeiDecimals(cumulated, expCumulated, DECIMALS_ERROR)
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
    describe('Events', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        })
        it('Minting energy for event', async () => {
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER)
            const balance = await myEnergy.eventBalanceOf(eventId, owner)
            expectEqEth(balance, ONE_ETHER)
        })
        it('Burning energy for event', async () => {
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER)
            const balance = await myEnergy.eventBalanceOf(eventId, owner)
            expectEqEth(balance, ONE_ETHER)
            await myEnergy.burnEvent(eventId, owner, ONE_ETHER)
            const afterBalance = await myEnergy.eventBalanceOf(eventId, owner)
            expectEqEth(afterBalance, 0)
        })
        it('Minting multiple energies for event (check variable)', async () => {
            const rate = await myEnergy.rate()
            await myEnergy.mintStatic(owner, ONE_ETHER)
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER)
            await myEnergy.mint(owner, ONE_ETHER)
            await advanceBlockInSeconds(SECONDS_PER_YEAR)

            const balance = await myEnergy.eventBalanceOf(eventId, owner)
            const totalSupply = await myEnergy.eventTotalSupply(eventId)
            const interest = ONE_ETHER.mul(getLinearInterest(0, SECONDS_PER_YEAR, rate)).div(ONE_ETHER)
            expectEqEth(balance, totalSupply)
            expectApproxWeiDecimals(balance, ONE_ETHER.add(TWO_ETHER).add(interest), DECIMALS_ERROR)
        })
        it('Cant mint energy to the zero address', async () => {
            await expectRevert(
                myEnergy.mintEvent(eventId, constants.AddressZero, ONE_ETHER),
                'TutellusEnergy: mint to the zero address'
            )
        })
        it('Cant mint 0 tokens', async () => {
            await expectRevert(
                myEnergy.mintEvent(eventId, owner, 0),
                'Cant mint 0 tokens'
            )
        })
        it('Cant burn energy to the zero address', async () => {
            await expectRevert(
                myEnergy.burnEvent(eventId, constants.AddressZero, ONE_ETHER),
                'TutellusEnergy: burn from the zero address'
            )
        })
        it('Cant burn 0 tokens', async () => {
            await expectRevert(
                myEnergy.burnEvent(eventId, owner, 0),
                'Cant burn 0 tokens'
            )
        })
        it('Cant burn amount that exceeds balance', async () => {
            await expectRevert(
                myEnergy.burnEvent(eventId, owner, ONE_ETHER),
                'TutellusEnergy: burn amount exceeds balance'
            )
        })
    })
    describe('Snapshots', () => {
        beforeEach(async () => {
            const Energy = await ethers.getContractFactory('TutellusEnergy')
            let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)

            const energy = await myManager.get(ENERGY_ID)
            myEnergy = Energy.attach(energy)
            await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
            await myManager.grantRole(ENERGY_MANAGER_ROLE, owner)
        })
        it('Can read snapshot for event balance of (check snapshot)', async () => {
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER) // In 1 will have 1
            await myEnergy.snapshot()
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER) // In 2 will have 2
            await myEnergy.snapshot()
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER) // In 3 will have 3
            await myEnergy.snapshot()
            const id = await myEnergy.getCurrentSnapshotId()
            expect(id.toNumber()).eq(3)
            await expectRevert(
                myEnergy.eventBalanceOfAt(eventId, owner, 0),
                'ERC20Snapshot: id is 0'
            ) // Cant read at 0
            const balance1 = await myEnergy.eventBalanceOfAt(eventId, owner, 1)
            const balance2 = await myEnergy.eventBalanceOfAt(eventId, owner, 2)
            const balance3 = await myEnergy.eventBalanceOfAt(eventId, owner, 3)
            await expectRevert(
                myEnergy.eventBalanceOfAt(eventId, owner, 4),
                'ERC20Snapshot: nonexistent id'
            ) // Cant read nonexistent id
            expectEqEth(balance1, ONE_ETHER)
            expectEqEth(balance2, TWO_ETHER)
            expectEqEth(balance3, THREE_ETHER)
        })
        it('Can read snapshot for event supply', async () => {
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER) // In 1 will have 1
            await myEnergy.snapshot()
            await myEnergy.mintEvent(eventId, person, ONE_ETHER) 
            await myEnergy.mintEvent(eventId, person2, ONE_ETHER) // In 2 will have 3
            await myEnergy.snapshot()
            await expectRevert(
                myEnergy.eventTotalSupplyAt(eventId, 0),
                'ERC20Snapshot: id is 0'
            ) // Cant read at 0
            const supply1 = await myEnergy.eventTotalSupplyAt(eventId, 1)
            const supply2 = await myEnergy.eventTotalSupplyAt(eventId, 2)
            await expectRevert(
                myEnergy.eventTotalSupplyAt(eventId, 3),
                'ERC20Snapshot: nonexistent id'
            ) // Cant read nonexistent id
            expectEqEth(supply1, ONE_ETHER)
            expectEqEth(supply2, THREE_ETHER)
        })
        it('Can read snapshots for events (multiple) supplies and balances', async () => {
            await myEnergy.mintEvent(eventId, owner, ONE_ETHER)
            await myEnergy.snapshot()
            await myEnergy.mintEvent(eventId, person, TWO_ETHER)
            await myEnergy.mintEvent(eventId2, owner, ONE_ETHER)
            await myEnergy.mintEvent(eventId2, person, ONE_ETHER)
            await myEnergy.snapshot()

            const [supply11, supply21, supply12, supply22] = await Promise.all([
                myEnergy.eventTotalSupplyAt(eventId, 1),
                myEnergy.eventTotalSupplyAt(eventId2, 1),
                myEnergy.eventTotalSupplyAt(eventId, 2),
                myEnergy.eventTotalSupplyAt(eventId2, 2)
            ])
            expectEqEth(supply11, ONE_ETHER)
            expectEqEth(supply21, 0)
            expectEqEth(supply12, THREE_ETHER)
            expectEqEth(supply22, TWO_ETHER)
            const [balanceOwner11, balanceOwner21, balanceOwner12, balanceOwner22] = await Promise.all([
                myEnergy.eventBalanceOfAt(eventId, owner, 1),
                myEnergy.eventBalanceOfAt(eventId2, owner, 1),
                myEnergy.eventBalanceOfAt(eventId, owner, 2),
                myEnergy.eventBalanceOfAt(eventId2, owner, 2)
            ])
            expectEqEth(balanceOwner11, ONE_ETHER)
            expectEqEth(balanceOwner21, 0)
            expectEqEth(balanceOwner12, ONE_ETHER)
            expectEqEth(balanceOwner22, ONE_ETHER)
            const [balancePerson11, balancePerson21, balancePerson12, balancePerson22] = await Promise.all([
                myEnergy.eventBalanceOfAt(eventId, person, 1),
                myEnergy.eventBalanceOfAt(eventId2, person, 1),
                myEnergy.eventBalanceOfAt(eventId, person, 2),
                myEnergy.eventBalanceOfAt(eventId2, person, 2)
            ])
            expectEqEth(balancePerson11, 0)
            expectEqEth(balancePerson21, 0)
            expectEqEth(balancePerson12, TWO_ETHER)
            expectEqEth(balancePerson22, ONE_ETHER)
        })
    })
})
  