const { artifacts, ethers } = require('hardhat')
// const { expect } = require('chai');
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time, expectEvent } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { BigNumber, constants } = require('ethers')
const { expectEqEth, expect1WeiApprox, etherToNumber, expectApproxWeiDecimals } = require('../../utils')
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
let myFactionManager
let myEnergy
let owner, person
let myLaunchpadStaking
let myLaunchpadFarming
let myRewardsVaultV2

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = ethers.utils.id('ENERGY_MANAGER_ROLE')
const REWARDS_MANAGER_ROLE = ethers.utils.id('REWARDS_MANAGER_ROLE')
const LAUNCHPAD_ADMIN_ROLE = ethers.utils.id('LAUNCHPAD_ADMIN_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')
const ENERGY_ID = ethers.utils.id('ENERGY');
const ONE_ETHER = parseEther('1')
const TWO_ETHER = parseEther('2')
const SIX_ETHER = parseEther('6')
const RAY = parseEther('1000000000')
const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')

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

describe('Launchpad Staking', function () {
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
        const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
        let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);

        const FactionManager = await ethers.getContractFactory('TutellusFactionManager');
        let initializeFactionManager = FactionManager.interface.encodeFunctionData('initialize', []);
        
        await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)
        await myManager.deploy(REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
        await myManager.deploy(FACTION_MANAGER, FactionManager.bytecode, initializeFactionManager)

        const energy = await myManager.get(ENERGY_ID)
        const rvv2 = await myManager.get(REWARDS_ID)
        const factionManager = await myManager.get(FACTION_MANAGER)
        expect(energy).not.eq(ZERO_ADDRESS)
        myEnergy = Energy.attach(energy)
        myRewardsVaultV2 = RewardsVaultV2.attach(rvv2)
        myFactionManager = FactionManager.attach(factionManager)

        await myManager.grantRole(MINTER_ROLE, owner)
        await myManager.grantRole(REWARDS_MANAGER_ROLE, owner)
        await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)
        await myManager.grantRole(LAUNCHPAD_ADMIN_ROLE, owner)
        await myManager.grantRole(ENERGY_MINTER_ROLE, owner)
        
        await myToken.mint(owner, parseEther('100000'))
    })

    describe('Deploy', () => {
        it('Deploying Launchpad Staking', async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
    })
    describe('Deposit', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
        it('Can deposit and get energy', async () => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const energyBalance = await myEnergy.balanceOf(owner)
            expect(etherToNumber(energyBalance)).eq(etherToNumber(ONE_ETHER))
        })
        it('Cant deposit 0 tokens', async() => {
            await expectRevert(
                myFactionManager.stake(NAKAMOTOS_FACTION, owner, 0),
                'TutellusLaunchpadStaking: amount must be over zero'
            )
        })
    })
    describe('Withdraw', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
        it('Can withdraw all and reset energy', async () => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await time.advanceBlock()

            await myFactionManager.unstake(owner, ONE_ETHER)

            const burned = await myToken.burned()

            expect(etherToNumber(burned)).eq(0)

            const energyBalance = await myEnergy.balanceOf(owner)
            expect(etherToNumber(energyBalance)).eq(0)
        })
        it('Can withdraw and burn fees', async () => {
            const BLOCKS = 10
            await myLaunchpadStaking.setFees(
                ONE_ETHER,
                TWO_ETHER,
                BLOCKS
            )

            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await time.advanceBlock()

            await myFactionManager.unstake(owner, ONE_ETHER)

            const burned = await myToken.burned()

            expect(etherToNumber(burned)).gt(0)

            const energyBalance = await myEnergy.balanceOf(owner)
            expect(etherToNumber(energyBalance)).eq(0)
        })
        it('Can deposit and withdraw twice (correct energy)', async () => {
            await myToken.approve(myFactionManager.address, TWO_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await time.advanceBlock()
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const balance = await myLaunchpadStaking.getUserBalance(owner)

            expect(etherToNumber(balance)).eq(etherToNumber(TWO_ETHER))

            await myFactionManager.unstake(owner, ONE_ETHER)
            await myFactionManager.unstake(owner, ONE_ETHER)

            const postBalance = await myLaunchpadStaking.getUserBalance(owner)
            const energyBalance = await myEnergy.balanceOf(owner)

            expect(etherToNumber(postBalance)).eq(0)
            expect(etherToNumber(energyBalance)).eq(0)
        })
        it('Cant withdraw 0 tokens', async() => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await expectRevert(
                myFactionManager.unstakeLP(owner, 0),
                'TutellusLaunchpadStaking: amount must be over zero'
            )
        })
        it('Cant withdraw more than balance', async() => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await expectRevert(
                myFactionManager.unstake(owner, TWO_ETHER),
                'TutellusLaunchpadStaking: user has not enough staking balance'
            )
        })
        it('Cant withdraw if not enought energy', async() => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await myEnergy.burnAll(owner)

            await expectRevert(
                myFactionManager.unstake(owner, ONE_ETHER),
                'TutellusLaunchpadStaking: need more energy to unstake'
            )
        })
        it('Cant withdraw if not from faction manager', async() => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await expectRevert(
                myLaunchpadStaking.withdraw(owner, ONE_ETHER),
                'TutellusLaunchpadStaking: only faction manager'
            )
        })
    })
    describe('Claim', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
        it('Can claim rewards', async () => {
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await time.advanceBlock()

            const [balancePrev, rewardPerBlock, pendingRewards] = await Promise.all([
                myToken.balanceOf(owner),
                myRewardsVaultV2.rewardPerBlock(),
                myLaunchpadStaking.pendingRewards(owner)
            ]) 

            await myLaunchpadStaking.claim(owner)

            const balancePost = await myToken.balanceOf(owner)
            const diff = balancePost.sub(balancePrev);
            expect(diff.gt(0)).eq(true)
        })
        it('Cant claim rewards if no deposit', async () => {
            const pendingRewards = await myLaunchpadStaking.pendingRewards(owner)
            expect(etherToNumber(pendingRewards)).eq(0)
            await expectRevert(
                myLaunchpadStaking.claim(owner),
                'TutellusLaunchpadStaking: nothing to claim'
            )
        })
    })
    describe('Sets', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
        it('Set fees to new depositors', async () => {
            const BLOCKS = 10
            await myLaunchpadStaking.setFees(
                ONE_ETHER,
                TWO_ETHER,
                BLOCKS
            )

            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const [blocksLeft, currentBlock, maxFee] = await Promise.all([
                myLaunchpadStaking.getBlocksLeft(owner),
                time.latestBlock(),
                myLaunchpadStaking.getFee(owner),
            ])

            expect(etherToNumber(maxFee)).eq(etherToNumber(TWO_ETHER))
            expect(Number(blocksLeft.toString())).eq(BLOCKS)
            await time.advanceBlockTo(Number(currentBlock) + BLOCKS + 1)

            const [minFee, zeroBlocksLeft] = await Promise.all([
                myLaunchpadStaking.getFee(owner),
                myLaunchpadStaking.getBlocksLeft(owner),
            ])

            expect(etherToNumber(minFee)).eq(etherToNumber(ONE_ETHER))
            expect(Number(zeroBlocksLeft.toString())).eq(0)
        })
        it('Cant set minFee greater than maxFee', async () => {
            await expectRevert(
                myLaunchpadStaking.setFees(TWO_ETHER, ONE_ETHER, 1),
                'TutellusLaunchpadStaking: mininum fee must be greater or equal than maximum fee'
            )
        })
        it('Cant set maxFee greater than 100 ether', async () => {
            await expectRevert(
                myLaunchpadStaking.setFees(TWO_ETHER, parseEther('101'), 1),
                'TutellusLaunchpadStaking: maxFee cannot exceed 100 ether'
            )
        })
        it('Set a new energy multiplier', async () => {
            await myLaunchpadStaking.setEnergyMultiplier(TWO_ETHER)
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            const energyBalance = await myEnergy.balanceOf(owner)
            expectEqEth(energyBalance, TWO_ETHER)
        })
    })
    describe('Autoreward', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
    
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
    
            const launchpadStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            const launchpadFarming = await myManager.get(NAKAMOTOS_FARMING_ID)

            expect(launchpadStaking).not.eq(ZERO_ADDRESS)
            expect(launchpadFarming).not.eq(ZERO_ADDRESS)

            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, launchpadFarming)

            await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
            await myRewardsVaultV2.add(launchpadStaking, [parseEther('100')])
            await myRewardsVaultV2.add(launchpadFarming, [parseEther('20'), parseEther('80')])
            await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

            myLaunchpadStaking = LaunchpadStaking.attach(launchpadStaking)
            myLaunchpadFarming = LaunchpadStaking.attach(launchpadFarming)

            // Creating a faction
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, myFactionManager.address)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, launchpadStaking, launchpadFarming)
        })
        it('Can claim rewards after withdraw if no autoreward', async () => {
            await myLaunchpadStaking.toggleAutoreward()
            await myToken.approve(myFactionManager.address, ONE_ETHER)
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await myFactionManager.unstake(owner, ONE_ETHER)
            
            const pendingRewards = await myLaunchpadStaking.pendingRewards(owner)

            expect(etherToNumber(pendingRewards)).gt(0)
            await myLaunchpadStaking.claim(owner)
        })
    })
})
  