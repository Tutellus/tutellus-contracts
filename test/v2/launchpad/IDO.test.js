const { ethers } = require('hardhat');
const {
    expectRevert,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const json = require('../../../examples/testnet/launchpad/test.json')
const { getIdoTree } = require('../../../utils/idoTree');
const TREE = getIdoTree(json)
const CLAIMS = TREE.toJSON().claims
const { getWhitelistTree } = require('../../../utils/whitelistTree');

const _BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const IDO_FACTORY_ID = ethers.utils.id('IDO_FACTORY')
const IDO_USDT_ID = ethers.utils.id('IDO_USDT')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const UPGRADER_ROLE = ethers.utils.id('UPGRADER_ROLE')
const ENERGY_ID = ethers.utils.id('ENERGY')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')
const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE');
const WHITELIST_ID = ethers.utils.id('WHITELIST');
const FUNDING_AMOUNT = ethers.utils.parseEther('10000')
const MIN_PREFUND = ethers.utils.parseEther('100')
let START_DATE, END_DATE

let accounts
let owner, funder, prefunder0, prefunder1, prefunder2, prefunder3
let myManager, myFactory, myIDO, myUSDT, myTUT, myIdoToken, myWhitelist

describe('IDOFactory & IDO', function () {
    beforeEach(async () => {
        accounts = await ethers.getSigners();
        [owner, funder, prefunder0, prefunder1, prefunder2, prefunder3] = accounts

        const TutellusManager = await ethers.getContractFactory('TutellusManager')
        const TutellusIDOFactory = await ethers.getContractFactory('TutellusIDOFactory')
        const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
        const TutellusERC20 = await ethers.getContractFactory('TutellusERC20')
        const TutellusEnergy = await ethers.getContractFactory("TutellusEnergy");
        const LaunchpadStaking = await ethers.getContractFactory("TutellusLaunchpadStaking");
        const FactionManager = await ethers.getContractFactory('TutellusFactionManager')
        const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
        const Token = await ethers.getContractFactory("Token");

        myManager = await TutellusManager.deploy()
        await myManager.deployed()
        await myManager.initialize()

        myTUT = await TutellusERC20.deploy("Tutellus token", "TUT", ethers.utils.parseEther('200000000'), myManager.address)
        await myManager.grantRole(MINTER_ROLE, owner.address)
        await myTUT.mint(owner.address, ethers.utils.parseEther('100000'))

        const initializeCalldata = TutellusEnergy.interface.encodeFunctionData('initialize', [])
        const energyImp = await TutellusEnergy.deploy()
        await energyImp.deployed()
        await myManager.deployProxyWithImplementation(ENERGY_ID, energyImp.address, initializeCalldata)
        await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
        const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
        await myTUT.mint(rewardsAddr, ethers.utils.parseEther('50000'))
        const factoryImp = await TutellusIDOFactory.deploy()
        await factoryImp.deployed()
        const initializeCalldataFactoryIDO = TutellusIDOFactory.interface.encodeFunctionData('initialize', [])
        await myManager.deployProxyWithImplementation(IDO_FACTORY_ID, factoryImp.address, initializeCalldataFactoryIDO)
        const factoryAddress = await myManager.get(IDO_FACTORY_ID)
        myFactory = await ethers.getContractAt('TutellusIDOFactory', factoryAddress)
        const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
        const myFactionManagerImp = await FactionManager.deploy()
        await myFactionManagerImp.deployed()
        const launchpadStakingImp = myLaunchpadStakingImp.address
        const factionManagerImp = myFactionManagerImp.address
        const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [myTUT.address])
        await myManager.deployProxyWithImplementation(FACTION_MANAGER, factionManagerImp, initializeCalldata)
        // NAKAMOTOS
        await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
        // VUTERINS
        await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
        // ALTCOINERS
        await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)

        const Whitelist = await ethers.getContractFactory('TutellusWhitelist');
        await myManager.deploy(
            WHITELIST_ID,
            Whitelist.bytecode,
            initializeCalldata,
        );
        const whitelistAddr = await myManager.get(WHITELIST_ID);
        myWhitelist = Whitelist.attach(whitelistAddr);

        await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
        const whitelist = [owner.address, funder.address, prefunder0.address, prefunder1.address, prefunder2.address, prefunder3.address];
        const tree = getWhitelistTree(whitelist).toJSON();
        await myWhitelist.updateMerkleRoot(tree.merkleRoot, 'URI');

        for (let i = 0; i < whitelist.length; i++) {
            const personClaim = tree.claims[whitelist[i]];
            await myWhitelist.add(
                personClaim.index,
                whitelist[i],
                personClaim.proof,
            );
        }

        const contracts = await Promise.all([
            myManager.get(FACTION_MANAGER),
            myManager.get(NAKAMOTOS_STAKING_ID),
            myManager.get(VUTERINS_STAKING_ID),
            myManager.get(ALTCOINERS_STAKING_ID),
        ])

        const [factionManager, nakamotosStaking, vuterinsStaking, altcoinersStaking] = contracts
        const myFactionManager = FactionManager.attach(factionManager)
        await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
        await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
        await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
        await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)
        await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner.address)
        await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, ethers.constants.AddressZero)
        await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, ethers.constants.AddressZero)
        await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, ethers.constants.AddressZero)

        myUSDT = await Token.deploy('name', 'symbol')
        await myUSDT.deployed()
        myIdoToken = await Token.deploy("Tutellus IDO 1", "IDO1")
        await myIdoToken.deployed()
        await myManager.setId(IDO_USDT_ID, myUSDT.address)
        block = await ethers.provider.getBlock()
        START_DATE = block.timestamp + 1000000
        END_DATE = block.timestamp + 2000000
        const idoCalldata = await TutellusIDO.interface.encodeFunctionData(
            'initialize',
            [
                myManager.address,
                FUNDING_AMOUNT,
                MIN_PREFUND,
                myIdoToken.address,
                myUSDT.address,
                START_DATE,
                END_DATE,
                0
            ]
        );
        const response = await myFactory.createProxy(idoCalldata)
        const receipt = await response.wait()
        myIDO = await ethers.getContractAt('TutellusIDO', receipt.events[2].args['proxy'])

        await myManager.grantRole(MINTER_ROLE, owner.address)
        await myManager.grantRole(UPGRADER_ROLE, owner.address)
        await myUSDT.mint(owner.address, ethers.utils.parseEther('1000000'))
        await myUSDT.mint(funder.address, ethers.utils.parseEther('1000000'))
        await myUSDT.mint(myIDO.address, ethers.utils.parseEther('1000000'))
        await myIdoToken.mint(myIDO.address, ethers.utils.parseEther('1000000'))
    });

    describe('Factory', function () {

        it('only DEFAULT_ADMIN_ROLE can create an IDO', async () => {
            const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
            const idoCalldata = await TutellusIDO.interface.encodeFunctionData(
                'initialize',
                [
                    myManager.address,
                    FUNDING_AMOUNT,
                    MIN_PREFUND,
                    myIdoToken.address,
                    myUSDT.address,
                    START_DATE,
                    END_DATE,
                    0
                ]
            );
            await expectRevert(
                (await myFactory.connect(funder)).createProxy(idoCalldata),
                'AccessControlProxyPausable: account ' + String(funder.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        });

        it('can create multiple IDOs and upgrade individually', async () => {
            const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
            const idoCalldata = TutellusIDO.interface.encodeFunctionData(
                'initialize',
                [
                    myManager.address,
                    FUNDING_AMOUNT,
                    MIN_PREFUND,
                    myIdoToken.address,
                    myUSDT.address,
                    START_DATE,
                    END_DATE,
                    0
                ]
            );
            const response = await myFactory.createProxy(idoCalldata)
            const receipt = await response.wait()
            let myIDO1 = await ethers.getContractAt('TutellusIDO', receipt.events[2].args['proxy'])
            const response2 = await myFactory.createProxy(idoCalldata)
            const receipt2 = await response2.wait()
            const myIDO2 = await ethers.getContractAt('TutellusIDO', receipt2.events[2].args['proxy'])
            const myProxy1 = await ethers.getContractAt('UUPSUpgradeableByRole', myIDO1.address)
            const myProxy2 = await ethers.getContractAt('UUPSUpgradeableByRole', myIDO2.address)
            const IDOV2Mock = await ethers.getContractFactory('IDOV2Mock')
            const customImplementation = await IDOV2Mock.deploy()
            await myProxy1.upgradeTo(customImplementation.address)
            myIDO1 = await ethers.getContractAt('IDOV2Mock', myIDO1.address)
            expect(await myIDO1.idoVersion()).to.equal("IDO-V2")
            expect(await myProxy1.implementation()).to.equal(customImplementation.address)
            expect(await myProxy2.implementation()).to.equal(await myFactory.fixedImplementation())
        });

        it('can create an IDO with custom implementation', async () => {
            const IDOV2Mock = await ethers.getContractFactory('IDOV2Mock')
            const customImplementation = await IDOV2Mock.deploy()
            const idoCalldata = IDOV2Mock.interface.encodeFunctionData(
                'initialize',
                [
                    myManager.address,
                    FUNDING_AMOUNT,
                    MIN_PREFUND,
                    myIdoToken.address,
                    myUSDT.address,
                    START_DATE,
                    END_DATE,
                    0
                ]
            );
            const response = await myFactory.createProxyWithCustomImplementation(customImplementation.address, idoCalldata)
            const receipt = await response.wait()
            const customIdo = await ethers.getContractAt('IDOV2Mock', receipt.events[1].args['proxy'])
            expect(await customIdo.idoVersion()).to.equal("IDO-V2")
        });

        it('can change fixedImplementation and create proxy using it', async () => {
            const IDOV2Mock = await ethers.getContractFactory('IDOV2Mock')
            const customImplementation = await IDOV2Mock.deploy()
            await myFactory.updateImplementation(customImplementation.address)
            const idoCalldata = IDOV2Mock.interface.encodeFunctionData(
                'initialize',
                [
                    myManager.address,
                    FUNDING_AMOUNT,
                    MIN_PREFUND,
                    myIdoToken.address,
                    myUSDT.address,
                    START_DATE,
                    END_DATE,
                    0
                ]
            );
            const response = await myFactory.createProxy(idoCalldata)
            const receipt = await response.wait()
            const customIdo = await ethers.getContractAt('IDOV2Mock', receipt.events[1].args['proxy'])
            expect(await customIdo.idoVersion()).to.equal("IDO-V2")
        });

        it('only DEFAULT_ADMIN_ROLE can create an IDO', async () => {
            const IDOV2Mock = await ethers.getContractFactory('IDOV2Mock')
            const customImplementation = await IDOV2Mock.deploy()
            await expectRevert(
                myFactory.connect(funder).updateImplementation(customImplementation.address),
                'AccessControlProxyPausable: account ' + String(funder.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
            await myFactory.updateImplementation(customImplementation.address)
        });
    });

    describe('IDO (prefund)', function () {

        it('can prefund', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount).toString())
        });

        it('cant prefund if not open', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')

            const openDate = parseInt(Date.now() / 1000) + 10000000
            const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
            const idoCalldata = await TutellusIDO.interface.encodeFunctionData(
                'initialize',
                [
                    myManager.address,
                    FUNDING_AMOUNT,
                    MIN_PREFUND,
                    myIdoToken.address,
                    myUSDT.address,
                    START_DATE,
                    END_DATE,
                    openDate
                ]
            );
            const response = await myFactory.createProxy(idoCalldata)
            const receipt = await response.wait()
            const newIDO = await ethers.getContractAt('TutellusIDO', receipt.events[2].args['proxy'])

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(newIDO.address)
            
            await myUSDT.connect(funder).approve(newIDO.address, ethers.constants.MaxUint256)
            await newIDO.connect(funder).acceptTermsAndConditions()

            await expectRevert(
                newIDO.connect(funder).prefund(funder.address, prefundAmount),
                'TutellusIDO: IDO is not open'
            )

            await ethers.provider.send("evm_setNextBlockTimestamp", [openDate + 1])

            await newIDO.connect(funder).prefund(funder.address, prefundAmount)

            const prefunded = await newIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(newIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount).toString())
        });

        it('cant prefund when closed', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')
            await (await myIDO.connect(funder)).acceptTermsAndConditions()

            await expectRevert(
                (await myIDO.connect(funder)).prefund(funder.address, prefundAmount),
                'TutellusIDO: IDO is closed'
            )

            await myIDO.open()

            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount).toString())
        });

        it('cant prefund if not acceptedTermsAndConditions', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')

            await myWhitelist.remove(funder.address)
            await myIDO.open()

            await expectRevert(
                (await myIDO.connect(funder)).prefund(funder.address, prefundAmount),
                'TutellusIDO: address not accepted terms and conditions'
            )

            const whitelist = [owner.address, funder.address, prefunder0.address, prefunder1.address, prefunder2.address, prefunder3.address];
            const tree = getWhitelistTree(whitelist).toJSON();
            const personClaim = tree.claims[funder.address];
            await myWhitelist.add(
                personClaim.index,
                funder.address,
                personClaim.proof
            );

            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount).toString())
        });

        it('can prefund exact min prefund amount', async () => {
            const prefundAmount = ethers.utils.parseEther('10')
            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await expectRevert(
                (await myIDO.connect(funder)).prefund(funder.address, prefundAmount),
                'TutellusIDO: insufficient prefund'
            )
            await (await myIDO.connect(funder)).prefund(funder.address, MIN_PREFUND)
            const prefunded = await myIDO.getPrefunded(funder.address)
            expect(prefunded.toString()).to.equal(MIN_PREFUND.toString())
        });

        it('can prefund 1 wei if total prefunded is gt min prefund', async () => {
            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            
            await expectRevert(
                (await myIDO.connect(funder)).prefund(funder.address, 1),
                'TutellusIDO: insufficient prefund'
            )
            myIDO.connect(funder).prefund(funder.address, MIN_PREFUND)
            await (await myIDO.connect(funder)).prefund(funder.address, 1)
            const prefunded = await myIDO.getPrefunded(funder.address)
            expect(prefunded.toString()).to.equal(MIN_PREFUND.add(1).toString())
        });

        it('reverts if prefund under minPrefund amount', async () => {
            const prefundAmount = ethers.utils.parseEther('10')
            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await expectRevert(
                (await myIDO.connect(funder)).prefund(funder.address, prefundAmount),
                'TutellusIDO: insufficient prefund'
            )
            await (await myIDO.connect(funder)).prefund(funder.address, MIN_PREFUND)
            const prefunded = await myIDO.getPrefunded(funder.address)
            expect(prefunded.toString()).to.equal(MIN_PREFUND.toString())
        });
    });

    describe('IDO (withdraw)', function () {

        it('can withdraw a portion (remainder over minPrefund)', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmount = ethers.utils.parseEther('2000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)
            await (await myIDO.connect(funder)).withdraw(withdrawAmount)
            const prefundedAfterWithdraw = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(prefundedAfterWithdraw.toString()).to.equal(prefundAmount.sub(withdrawAmount).toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount.sub(withdrawAmount)).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount.sub(withdrawAmount)).toString())
        });

        it('cant withdraw when closed', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmount = ethers.utils.parseEther('2000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)

            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')

            await expectRevert(
                (await myIDO.connect(funder)).withdraw(withdrawAmount),
                'TutellusIDO: IDO is closed'
            )

            await myIDO.open()

            await (await myIDO.connect(funder)).withdraw(withdrawAmount)
            const prefundedAfterWithdraw = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(prefundedAfterWithdraw.toString()).to.equal(prefundAmount.sub(withdrawAmount).toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount.sub(withdrawAmount)).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount.sub(withdrawAmount)).toString())
        });

        it('cannot withdraw a portion (remainder under minPrefund)', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmountWrong = ethers.utils.parseEther('4901')
            const withdrawAmountRight = ethers.utils.parseEther('4900')

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            await expectRevert(
                (await myIDO.connect(funder)).withdraw(withdrawAmountWrong),
                'TutellusIDO: try withdrawAll'
            )
            await (await myIDO.connect(funder)).withdraw(withdrawAmountRight)
        });

        it('cannot withdraw more than prefunded', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmountWrong = ethers.utils.parseEther('5001')
            const withdrawAmountRight = ethers.utils.parseEther('4000')

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            await expectRevert(
                (await myIDO.connect(funder)).withdraw(withdrawAmountWrong),
                'TutellusIDO: cant withdraw more than prefunded'
            )
            await (await myIDO.connect(funder)).withdraw(withdrawAmountRight)
        });

        it('can withdrawAll', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)
            await (await myIDO.connect(funder)).withdrawAll()
            const prefundedAfterWithdraw = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(prefundedAfterWithdraw.toString()).to.equal(prefundAmount.sub(withdrawAmount).toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount.sub(withdrawAmount)).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount.sub(withdrawAmount)).toString())
        });

        it('cant withdrawAll when closed', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).acceptTermsAndConditions()
            await (await myIDO.connect(funder)).prefund(funder.address, prefundAmount)
            const prefunded = await myIDO.getPrefunded(funder.address)

            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')

            await expectRevert(
                (await myIDO.connect(funder)).withdrawAll(),
                'TutellusIDO: IDO is closed'
            )

            await myIDO.open()

            await (await myIDO.connect(funder)).withdrawAll()
            const prefundedAfterWithdraw = await myIDO.getPrefunded(funder.address)

            const funderBalancePost = await myUSDT.balanceOf(funder.address)
            const idoBalancePost = await myUSDT.balanceOf(myIDO.address)

            expect(prefunded.toString()).to.equal(prefundAmount.toString())
            expect(prefundedAfterWithdraw.toString()).to.equal(prefundAmount.sub(withdrawAmount).toString())
            expect(funderBalancePre.toString()).to.equal(funderBalancePost.add(prefundAmount.sub(withdrawAmount)).toString())
            expect(idoBalancePost.toString()).to.equal(idoBalancePre.add(prefundAmount.sub(withdrawAmount)).toString())
        });
    });

    describe('IDO (claim)', function () {

        it('can claim', async () => {
            let slot = (END_DATE - START_DATE) / 4
            let divisionBN = ethers.BigNumber.from('4')
            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')
            for (let i = 2; i < 6; i++) {
                await (await myIDO.connect(accounts[i])).acceptTermsAndConditions()
                await ethers.provider.send("evm_setNextBlockTimestamp", [START_DATE + ((i-2) * slot)])
                await myIDO.claim(
                    CLAIMS[accounts[i].address].index,
                    accounts[i].address,
                    CLAIMS[accounts[i].address].allocation,
                    CLAIMS[accounts[i].address].withdraw,
                    CLAIMS[accounts[i].address].energy,
                    CLAIMS[accounts[i].address].proof
                )
                let idoBalance = await myIdoToken.balanceOf(accounts[i].address)
                expect(idoBalance.toString()).to.equal(ethers.BigNumber.from(json[accounts[i].address].allocation).mul(ethers.BigNumber.from((i-2).toString())).div(divisionBN).toString())
                let usdtBalancePre = await myUSDT.balanceOf(accounts[i].address)
                expect(usdtBalancePre.toString()).to.equal('0')
                await myIDO.withdrawLeft(
                    CLAIMS[accounts[i].address].index,
                    accounts[i].address,
                    CLAIMS[accounts[i].address].allocation,
                    CLAIMS[accounts[i].address].withdraw,
                    CLAIMS[accounts[i].address].energy,
                    CLAIMS[accounts[i].address].proof
                )
                let usdtBalancePost = await myUSDT.balanceOf(accounts[i].address)
                expect(usdtBalancePost.toString()).to.equal(json[accounts[i].address].withdraw)
            }

            await ethers.provider.send("evm_setNextBlockTimestamp", [END_DATE + 1000000])
            for (let i = 2; i < 6; i++) {
                await myIDO.claim(
                    CLAIMS[accounts[i].address].index,
                    accounts[i].address,
                    CLAIMS[accounts[i].address].allocation,
                    CLAIMS[accounts[i].address].withdraw,
                    CLAIMS[accounts[i].address].energy,
                    CLAIMS[accounts[i].address].proof
                )
                let idoBalance = await myIdoToken.balanceOf(accounts[i].address)
                expect(idoBalance.toString()).to.equal(ethers.BigNumber.from(json[accounts[i].address].allocation).toString())
                let usdtBalance = await myUSDT.balanceOf(accounts[i].address)
                expect(usdtBalance.toString()).to.equal(json[accounts[i].address].withdraw)
            }
        });

        it('cant claim with wrong proof', async () => {
            await myIDO.updateMerkleRoot(TREE.toJSON().merkleRoot, '')
            await (await myIDO.connect(accounts[2])).acceptTermsAndConditions()
            await expectRevert(
                myIDO.connect(funder).claim(
                    CLAIMS[accounts[2].address].index,
                    accounts[2].address,
                    CLAIMS[accounts[2].address].allocation,
                    CLAIMS[accounts[2].address].withdraw,
                    CLAIMS[accounts[2].address].energy,
                    CLAIMS[accounts[3].address].proof
                ),
                'TutellusIDO: Invalid merkle proof'
            )
        });
    });

    describe('IDO (other)', function () {

        it('can sync', async () => {
            const balanceIDO1 = await myUSDT.balanceOf(myIDO.address)
            const balanceAdmin1 = await myUSDT.balanceOf(owner.address)
            await myIDO.sync()
            const balanceIDO2 = await myUSDT.balanceOf(myIDO.address) 
            const balanceAdmin2 = await myUSDT.balanceOf(owner.address)
            expect(balanceAdmin1.add(balanceIDO1).toString()).to.equal(balanceAdmin2.toString())
            expect(balanceIDO2.add(balanceIDO1).toString()).to.equal(balanceIDO1.toString())
        });

        it('only default admin role can sync', async () => {
            const balanceIDO1 = await myUSDT.balanceOf(myIDO.address)
            const balanceAdmin1 = await myUSDT.balanceOf(owner.address)

            await expectRevert(
                (await myIDO.connect(funder)).sync(),
                'AccessControlProxyPausable: account ' + String(funder.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )

            await myIDO.sync()
            const balanceIDO2 = await myUSDT.balanceOf(myIDO.address) 
            const balanceAdmin2 = await myUSDT.balanceOf(owner.address)
            expect(balanceAdmin1.add(balanceIDO1).toString()).to.equal(balanceAdmin2.toString())
            expect(balanceIDO2.add(balanceIDO1).toString()).to.equal(balanceIDO1.toString())
        });
    });
})
