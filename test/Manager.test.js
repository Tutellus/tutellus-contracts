const { artifacts, ethers } = require('hardhat')
// const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
//   const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
//   const { fromEther } = require('../ethers.utils/shared')
const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const Manager = artifacts.require('TutellusManager')
// const Staking = artifacts.require('TutellusStaking')
// const Farming = artifacts.require('TutellusFarming')
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
let owner, person

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

describe.only('Manager', function () {
    before(async () => {
        [owner, person] = await web3.eth.getAccounts()
    })
    beforeEach(async () => {
        const previous = await latestBlock()
        myDeployer = await Deployer.new(owner, previous)
        const addresses = await getAddresses()
        await setInstances(addresses)
    })

    describe('Manager integration', () => {
        it('Deploying and updating manager', async () => {
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
    })
    describe('Contract deployment', () => {
        beforeEach(async () => {
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
        it('Deploying new', async () => {
            const stakingFactory = await ethers.getContractFactory('TutellusStakingV2')
            let initializeCalldata = stakingFactory.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ethers.utils.id('STAKING_V2'), stakingFactory.bytecode, initializeCalldata)
        })
        it('Deployment of a new implementation (already initialized)', async () => {
            const stakingFactory = await ethers.getContractFactory('TutellusStakingV2')
            let initializeCalldata = stakingFactory.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ethers.utils.id('STAKING_V2'), stakingFactory.bytecode, initializeCalldata)
            await myManager.deploy(ethers.utils.id('STAKING_V2'), stakingFactory.bytecode, '0x')
        })
        it('Deployment of a new implementation (not initialized)', async () => {
            const stakingFactory = await ethers.getContractFactory('TutellusStakingV2')
            let initializeCalldata = stakingFactory.interface.encodeFunctionData('initialize', []);

            await myManager.deploy(ethers.utils.id('STAKING_V2'), stakingFactory.bytecode, '0x')
            await expectRevert(
                myManager.deploy(ethers.utils.id('STAKING_V2'), stakingFactory.bytecode, initializeCalldata),
                'Transaction reverted: function call to a non-contract account'
            ) // AccessControl not initialized
        })
        it('Deploying proxy with deployed implementation', async () => {
            const stakingFactory = await ethers.getContractFactory('TutellusStakingV2')
            let initializeCalldata = stakingFactory.interface.encodeFunctionData('initialize', []);

            const myStaking = await stakingFactory.deploy()

            await myManager.deployProxyWithImplementation(
                ethers.utils.id('STAKING_V2'),
                myStaking.address,
                initializeCalldata
            )
        })
    })
    describe('Locking', () => {
        beforeEach(async () => {
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
        it('Cant setId if locked', async () => {
            await myManager.lock(ethers.utils.id('ERC20'))
            await expectRevert(
                myManager.setId(ethers.utils.id('ERC20'), ZERO_ADDRESS),
                "TutellusManager: id locked"
            )
        })
        it('Cant deploy proxy with deployed implementation if locked', async () => {
            await myManager.lock(ethers.utils.id('STAKING_V2'))
            const stakingFactory = await ethers.getContractFactory('TutellusStakingV2')
            let initializeCalldata = stakingFactory.interface.encodeFunctionData('initialize', []);

            const myStaking = await stakingFactory.deploy()

            await expectRevert(
                myManager.deployProxyWithImplementation(
                    ethers.utils.id('STAKING_V2'),
                    myStaking.address,
                    initializeCalldata
                ),
                "TutellusManager: id locked"
            ) 
        })
    })
})
  