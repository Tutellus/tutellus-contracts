const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time, expectEvent } = require('@openzeppelin/test-helpers')
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
const LaunchpadStakingArtifact = artifacts.require('TutellusLaunchpadStaking')
const FactionManagerArtifact = artifacts.require('TutellusFactionManager')
const { getWhitelistTree } = require('../../../utils/whitelistTree');

let myDeployer
let myToken
let myRewardsVault
let myHoldersVault
let myTreasuryVault
let myManager
let myEnergy
let owner, person
let myRewardsVaultV2
let myFactionManager

let vuterinsStaking, vuterinsFarming, nakamotosStaking, nakamotosFarming, factionManager, myWhitelist, tree, whitelist, personClaim, ownerClaim

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = ethers.utils.id('ENERGY_MANAGER_ROLE')
const REWARDS_MANAGER_ROLE = ethers.utils.id('REWARDS_MANAGER_ROLE')
const LAUNCHPAD_ADMIN_ROLE = ethers.utils.id('LAUNCHPAD_ADMIN_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE = ethers.utils.id('ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')
const ENERGY_MULTIPLIER_MANAGER = ethers.utils.id('ENERGY_MULTIPLIER_MANAGER')
const ENERGY_ID = ethers.utils.id('ENERGY');
const ONE_ETHER = parseEther('1')
const TWO_ETHER = parseEther('2')
const SIX_ETHER = parseEther('6')
const RAY = parseEther('1000000000')

const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')

const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')

const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE');
const WHITELIST_ID = ethers.utils.id('WHITELIST');
const URI = 'uri';

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

describe('Factions', function () {
    before(async () => {
        [owner, person] = await web3.eth.getAccounts()
        whitelist = [owner, person];
        tree = getWhitelistTree(whitelist).toJSON();
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
        const TutellusEnergyMultiplierManager = await ethers.getContractFactory('TutellusEnergyMultiplierManager')
        let initializeCalldata = Energy.interface.encodeFunctionData('initialize', []);
        
        await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)
        await myManager.deploy(REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
        await myManager.deploy(ENERGY_MULTIPLIER_MANAGER, TutellusEnergyMultiplierManager.bytecode, initializeCalldata)

        const energy = await myManager.get(ENERGY_ID)
        const rvv2 = await myManager.get(REWARDS_ID)
        const energyManagerAddr = await myManager.get(ENERGY_MULTIPLIER_MANAGER)
        expect(energy).not.eq(constants.ZeroAddress)
        myEnergy = Energy.attach(energy)
        myRewardsVaultV2 = RewardsVaultV2.attach(rvv2)
        myEnergyManager = TutellusEnergyMultiplierManager.attach(energyManagerAddr)

        await myManager.grantRole(MINTER_ROLE, owner)
        await myManager.grantRole(REWARDS_MANAGER_ROLE, owner)
        await myToken.mint(owner, parseEther('100000'))
        await myToken.mint(myRewardsVaultV2.address, parseEther('1000'))
        await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

        // Whitelist deploy
        const Whitelist = await ethers.getContractFactory('TutellusWhitelist');
        const initializeCalldata2 = Whitelist.interface.encodeFunctionData('initialize', []);
        await myManager.deploy(
            WHITELIST_ID,
            Whitelist.bytecode,
            initializeCalldata2,
        );
        const whitelistAddr = await myManager.get(WHITELIST_ID);
        myWhitelist = Whitelist.attach(whitelistAddr);

        // add accounts to whitelist
        await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner);
        await myWhitelist.updateMerkleRoot(tree.merkleRoot, URI);
        const personClaim = tree.claims[person];
        const ownerClaim = tree.claims[owner];

        await myWhitelist.add(
            personClaim.index,
            person,
            personClaim.proof,
        );
        await myWhitelist.add(
            ownerClaim.index,
            owner,
            ownerClaim.proof,
        );

    })
    describe('Deploy', () => {
        it('Deploying Factions', async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
            let initializeCalldataFactionManager = FactionManager.interface.encodeFunctionData('initialize', []);
    
            await myManager.deploy(VUTERINS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(VUTERINS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(FACTION_MANAGER, FactionManager.bytecode, initializeCalldataFactionManager)

            vuterinsStaking = await myManager.get(VUTERINS_STAKING_ID)
            vuterinsFarming = await myManager.get(VUTERINS_FARMING_ID)
            nakamotosStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            nakamotosFarming = await myManager.get(NAKAMOTOS_FARMING_ID)
            factionManager = await myManager.get(FACTION_MANAGER)

            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
            await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, owner)

            await myRewardsVaultV2.add(vuterinsStaking, [parseEther('100')])
            await myRewardsVaultV2.add(vuterinsFarming, [parseEther('50'), parseEther('50')])
            await myRewardsVaultV2.add(nakamotosStaking, [parseEther('33'), parseEther('33'), parseEther('34')])
            await myRewardsVaultV2.add(nakamotosFarming, [parseEther('25'), parseEther('25'), parseEther('25'), parseEther('25')])

            await myEnergyManager.setMultiplierType(vuterinsStaking, 1)
            await myEnergyManager.setMultiplierType(nakamotosStaking, 1)
            await myEnergyManager.setMultiplierType(vuterinsFarming, 1)
            await myEnergyManager.setMultiplierType(nakamotosFarming, 1)

            myFactionManager = FactionManager.attach(factionManager)
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)
            await myManager.grantRole(FACTION_MANAGER, owner)
            await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

            await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
            await myToken.approve(myFactionManager.address, constants.MaxUint256)
        })
    })
    describe('Deposit', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
            let initializeCalldataFactionManager = FactionManager.interface.encodeFunctionData('initialize', []);
    
            await myManager.deploy(VUTERINS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(VUTERINS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(FACTION_MANAGER, FactionManager.bytecode, initializeCalldataFactionManager)

            vuterinsStaking = await myManager.get(VUTERINS_STAKING_ID)
            vuterinsFarming = await myManager.get(VUTERINS_FARMING_ID)
            nakamotosStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            nakamotosFarming = await myManager.get(NAKAMOTOS_FARMING_ID)
            factionManager = await myManager.get(FACTION_MANAGER)

            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
            await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, owner)

            await myRewardsVaultV2.add(vuterinsStaking, [parseEther('100')])
            await myRewardsVaultV2.add(vuterinsFarming, [parseEther('50'), parseEther('50')])
            await myRewardsVaultV2.add(nakamotosStaking, [parseEther('33'), parseEther('33'), parseEther('34')])
            await myRewardsVaultV2.add(nakamotosFarming, [parseEther('25'), parseEther('25'), parseEther('25'), parseEther('25')])

            await myEnergyManager.setMultiplierType(vuterinsStaking, 1)
            await myEnergyManager.setMultiplierType(nakamotosStaking, 1)
            await myEnergyManager.setMultiplierType(vuterinsFarming, 1)
            await myEnergyManager.setMultiplierType(nakamotosFarming, 1)

            myFactionManager = FactionManager.attach(factionManager)
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)
            await myManager.grantRole(FACTION_MANAGER, owner)
            await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

            await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
            await myToken.approve(myFactionManager.address, constants.MaxUint256)
        })
        it('Can stake into nakamotos and get energy', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const energyBalance = await myEnergy.balanceOf(owner)
            expect(etherToNumber(energyBalance)).eq(etherToNumber(ONE_ETHER))

            const faction = await myFactionManager.factionOf(owner)
            expect(faction).eq(NAKAMOTOS_FACTION)
        })
        it('Cant stake into multiple factions', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await expectRevert(
                myFactionManager.stake(VUTERINS_FACTION, owner, ONE_ETHER),
                'TutellusFactionManager: cant stake in multiple factions'
            )
        })
        it('Cant stake from unauthorized party', async () => {
            const myFactionManagerArtifact = await FactionManagerArtifact.at(factionManager)
            await expectRevert(
                myFactionManagerArtifact.stake(VUTERINS_FACTION, owner, ONE_ETHER, { from: person }),
                'TutellusFactionManager: account not authorized'
            )
        })
        it('Cant deposit from non faction', async () => {
            const myFactionManagerArtifact = await FactionManagerArtifact.at(factionManager)
            await expectRevert(
                myFactionManagerArtifact.depositFrom(owner, ONE_ETHER, myToken.address),
                'TutellusFactionManager: deposit only callable by faction contract'
            )
        })
    })
    describe('Withdraw', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
            let initializeCalldataFactionManager = FactionManager.interface.encodeFunctionData('initialize', []);
    
            await myManager.deploy(VUTERINS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(VUTERINS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(FACTION_MANAGER, FactionManager.bytecode, initializeCalldataFactionManager)

            vuterinsStaking = await myManager.get(VUTERINS_STAKING_ID)
            vuterinsFarming = await myManager.get(VUTERINS_FARMING_ID)
            nakamotosStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            nakamotosFarming = await myManager.get(NAKAMOTOS_FARMING_ID)
            factionManager = await myManager.get(FACTION_MANAGER)

            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
            await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, owner)

            await myRewardsVaultV2.add(vuterinsStaking, [parseEther('100')])
            await myRewardsVaultV2.add(vuterinsFarming, [parseEther('50'), parseEther('50')])
            await myRewardsVaultV2.add(nakamotosStaking, [parseEther('33'), parseEther('33'), parseEther('34')])
            await myRewardsVaultV2.add(nakamotosFarming, [parseEther('25'), parseEther('25'), parseEther('25'), parseEther('25')])

            await myEnergyManager.setMultiplierType(vuterinsStaking, 1)
            await myEnergyManager.setMultiplierType(nakamotosStaking, 1)
            await myEnergyManager.setMultiplierType(vuterinsFarming, 1)
            await myEnergyManager.setMultiplierType(nakamotosFarming, 1)

            myFactionManager = FactionManager.attach(factionManager)
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)
            await myManager.grantRole(FACTION_MANAGER, owner)
            await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

            await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
            await myToken.approve(myFactionManager.address, constants.MaxUint256)
        })
        it('Can deposit into staking and farming and withdraw all', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await myFactionManager.stakeLP(NAKAMOTOS_FACTION, owner, TWO_ETHER)

            await time.advanceBlock()

            await myFactionManager.unstake(owner, ONE_ETHER)
            await myFactionManager.unstakeLP(owner, TWO_ETHER)

            const energyBalance = await myEnergy.balanceOf(owner)
            const faction = await myFactionManager.factionOf(owner)

            expect(faction).eq(constants.HashZero)
            expect(etherToNumber(energyBalance)).eq(0)
        })
        it('Can deposit and withdraw twice (correct energy)', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            await time.advanceBlock()
        
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await myFactionManager.unstake(owner, ONE_ETHER)
            await myFactionManager.unstake(owner, ONE_ETHER)

            const energyBalance = await myEnergy.balanceOf(owner)
            const faction = await myFactionManager.factionOf(owner)

            expect(faction).eq(constants.HashZero)
            expect(etherToNumber(energyBalance)).eq(0)
        })
        it('Cant withdraw if no faction', async() => {
            await expectRevert(
                myFactionManager.unstake(owner, ONE_ETHER),
                'TutellusFactionManager: cant unstake'
            )
            await expectRevert(
                myFactionManager.unstakeLP(owner, ONE_ETHER),
                'TutellusFactionManager: cant unstakeLP'
            )
        })
        it('Cant withdraw more than balance', async() => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await expectRevert(
                myFactionManager.unstake(owner, TWO_ETHER),
                'TutellusLaunchpadStaking: user has not enough staking balance'
            )
        })
    })
    describe('Migrate', () => {
        beforeEach(async () => {
            const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
            const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

            let initializeCalldata = LaunchpadStaking.interface.encodeFunctionData('initialize', [myToken.address]);
            let initializeCalldataFactionManager = FactionManager.interface.encodeFunctionData('initialize', []);
    
            await myManager.deploy(VUTERINS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(VUTERINS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldata)
            await myManager.deploy(FACTION_MANAGER, FactionManager.bytecode, initializeCalldataFactionManager)

            vuterinsStaking = await myManager.get(VUTERINS_STAKING_ID)
            vuterinsFarming = await myManager.get(VUTERINS_FARMING_ID)
            nakamotosStaking = await myManager.get(NAKAMOTOS_STAKING_ID)
            nakamotosFarming = await myManager.get(NAKAMOTOS_FARMING_ID)
            factionManager = await myManager.get(FACTION_MANAGER)

            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
            await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
            await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, owner)

            await myRewardsVaultV2.add(vuterinsStaking, [parseEther('100')])
            await myRewardsVaultV2.add(vuterinsFarming, [parseEther('50'), parseEther('50')])
            await myRewardsVaultV2.add(nakamotosStaking, [parseEther('33'), parseEther('33'), parseEther('34')])
            await myRewardsVaultV2.add(nakamotosFarming, [parseEther('25'), parseEther('25'), parseEther('25'), parseEther('25')])

            await myEnergyManager.setMultiplierType(vuterinsStaking, 1)
            await myEnergyManager.setMultiplierType(nakamotosStaking, 1)
            await myEnergyManager.setMultiplierType(vuterinsFarming, 1)
            await myEnergyManager.setMultiplierType(nakamotosFarming, 1)

            myFactionManager = FactionManager.attach(factionManager)
            await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)
            await myManager.grantRole(FACTION_MANAGER, owner)
            await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

            await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
            await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
            await myToken.approve(myFactionManager.address, constants.MaxUint256)
        })
        it('Can deposit into staking and migrate faction', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const myFactionManagerArtifact = await FactionManagerArtifact.at(myFactionManager.address)
            const receipt = await myFactionManagerArtifact.migrateFaction(owner, VUTERINS_FACTION)

            expectEvent(receipt, 'Unstake', {
                id: NAKAMOTOS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'Stake', {
                id: VUTERINS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'Migrate', {
                id: NAKAMOTOS_FACTION,
                to: VUTERINS_FACTION
            })

            const faction = await myFactionManager.factionOf(owner)
            expect(faction).eq(VUTERINS_FACTION)
        })
        it('Can deposit into staking and migrate faction from authorized party', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await myFactionManager.authorize(person)

            const myFactionManagerArtifact = await FactionManagerArtifact.at(myFactionManager.address)
            const receipt = await myFactionManagerArtifact.migrateFaction(owner, VUTERINS_FACTION, { from: person })

            expectEvent(receipt, 'Unstake', {
                id: NAKAMOTOS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'Stake', {
                id: VUTERINS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'Migrate', {
                id: NAKAMOTOS_FACTION,
                to: VUTERINS_FACTION
            })

            const faction = await myFactionManager.factionOf(owner)
            expect(faction).eq(VUTERINS_FACTION)
        })
        it('Can deposit into farming and migrate faction', async () => {
            await myFactionManager.stakeLP(NAKAMOTOS_FACTION, owner, ONE_ETHER)

            const myFactionManagerArtifact = await FactionManagerArtifact.at(myFactionManager.address)
            const receipt = await myFactionManagerArtifact.migrateFaction(owner, VUTERINS_FACTION)

            expectEvent(receipt, 'UnstakeLP', {
                id: NAKAMOTOS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'StakeLP', {
                id: VUTERINS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'Migrate', {
                id: NAKAMOTOS_FACTION,
                to: VUTERINS_FACTION
            })

            const faction = await myFactionManager.factionOf(owner)
            expect(faction).eq(VUTERINS_FACTION)
        })
        it('Can deposit into staking and farming and migrate faction', async () => {

            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await myFactionManager.stakeLP(NAKAMOTOS_FACTION, owner, TWO_ETHER)

            const myFactionManagerArtifact = await FactionManagerArtifact.at(myFactionManager.address)
            const receipt = await myFactionManagerArtifact.migrateFaction(owner, VUTERINS_FACTION)

            const {stakingContract, farmingContract} = await myFactionManager.faction(VUTERINS_FACTION)

            const myStaking = await LaunchpadStakingArtifact.at(stakingContract)
            const myFarming = await LaunchpadStakingArtifact.at(farmingContract)

            const [stakingBalance, farmingBalance] = await Promise.all([
                myStaking.getUserBalance(owner),
                myFarming.getUserBalance(owner),
            ])

            expectEqEth(stakingBalance, ONE_ETHER)
            expectEqEth(farmingBalance, TWO_ETHER)

            expectEvent(receipt, 'Unstake', {
                id: NAKAMOTOS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'UnstakeLP', {
                id: NAKAMOTOS_FACTION,
                account: owner,
                amount: TWO_ETHER.toString()
            })
            expectEvent(receipt, 'Stake', {
                id: VUTERINS_FACTION,
                account: owner,
                amount: ONE_ETHER.toString()
            })
            expectEvent(receipt, 'StakeLP', {
                id: VUTERINS_FACTION,
                account: owner,
                amount: TWO_ETHER.toString()
            })
            expectEvent(receipt, 'Migrate', {
                id: NAKAMOTOS_FACTION,
                to: VUTERINS_FACTION
            })

            const faction = await myFactionManager.factionOf(owner)
            expect(faction).eq(VUTERINS_FACTION)
        })
        it('Cant migrate if no faction', async () => {
            await expectRevert(
                myFactionManager.migrateFaction(owner, VUTERINS_FACTION),
                'TutellusFactionManager: cant migrate'
            )
        })
        it('Cant migrate to a non existent faction', async () => {
            await myFactionManager.stake(NAKAMOTOS_FACTION, owner, ONE_ETHER)
            await expectRevert(
                myFactionManager.migrateFaction(owner, constants.HashZero),
                'TutellusFactionManager: faction does not exist'
            )
        })
    })
})
  