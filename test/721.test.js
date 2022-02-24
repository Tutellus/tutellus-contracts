const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { BigNumber } = require('ethers')
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
let myNFT
let owner, person

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = ethers.utils.id('ENERGY_MANAGER_ROLE')
const ADMIN_721_ROLE = ethers.utils.id('ADMIN_721_ROLE')
const ENERGY_ID = ethers.utils.id('ENERGY');
const NFT_ID = ethers.utils.id('721');
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

describe.only('721 tokens', function () {
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

        const Energy = await ethers.getContractFactory('TutellusEnergy')
        const NFT = await ethers.getContractFactory('Tutellus721')

        let initializeCalldataEnergy = Energy.interface.encodeFunctionData('initialize', []);
        let initializeCalldataNFT = NFT.interface.encodeFunctionData('initialize', []);

        await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldataEnergy)
        await myManager.deploy(NFT_ID, NFT.bytecode, initializeCalldataNFT)

        const [energy, nft] = await Promise.all([
            myManager.get(ENERGY_ID),
            myManager.get(NFT_ID),
        ])

        myEnergy = Energy.attach(energy)
        myNFT = NFT.attach(nft)
    })

    describe('Create event', () => {
        it('Can create a new event', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)

            const myEvent = {
                id: ethers.utils.id('quedada-1-madrid'),
                energy: parseEther('0'),
                perpetual: true,
                uri: 'uri/quedada-1-madrid'
            }

            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
            
            const {
                uri,
                valid,
                perpetual,
                energy
            } = await myNFT.events(myEvent.id)

            expect(uri).eq(myEvent.uri)
            expect(perpetual).eq(myEvent.perpetual)
            expect(valid).eq(true)
            expectEqEth(energy, myEvent.energy)

        })
    })
})
  