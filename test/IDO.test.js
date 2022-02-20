const { ethers } = require('hardhat');
const {
    expectRevert
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const _BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const IDO_FACTORY_ID = ethers.utils.id('IDO_FACTORY')
const IDO_USDT_ID = ethers.utils.id('IDO_USDT')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const FUNDING_AMOUNT = ethers.utils.parseEther('10000')
const MIN_PREFUND = ethers.utils.parseEther('100')

let owner, funder
let myManager, myFactory, myIDO, myUSDT

describe('IDOFactory & IDO', function () {
    beforeEach(async () => {
        [owner, funder] = await ethers.getSigners();

        const TutellusManager = await ethers.getContractFactory('TutellusManager')
        const TutellusIDOFactory = await ethers.getContractFactory('TutellusIDOFactory')
        const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
        const TutellusERC20 = await ethers.getContractFactory('TutellusERC20')

        myManager = await TutellusManager.deploy()
        await myManager.deployed()
        await myManager.initialize()

        const initiallizeCalldata = await TutellusIDOFactory.interface.encodeFunctionData('initialize', [])
        const factoryImp = await TutellusIDOFactory.deploy()
        await factoryImp.deployed()
        await myManager.deployProxyWithImplementation(IDO_FACTORY_ID, factoryImp.address, initiallizeCalldata)
        const factoryAddress = await myManager.get(IDO_FACTORY_ID)
        myFactory = await ethers.getContractAt('TutellusIDOFactory', factoryAddress)
        myUSDT = await TutellusERC20.deploy('name', 'symbol', ethers.constants.MaxUint256, myManager.address)
        await myUSDT.deployed()
        await myManager.setId(IDO_USDT_ID, myUSDT.address)
        const idoCalldata = await TutellusIDO.interface.encodeFunctionData('initialize', [myManager.address, FUNDING_AMOUNT, MIN_PREFUND]);
        const response = await myFactory.createProxy(idoCalldata)
        const receipt = await response.wait()
        myIDO = await ethers.getContractAt('TutellusIDO', receipt.events[1].args['proxy'])

        await myManager.grantRole(MINTER_ROLE, owner.address)
        await myUSDT.mint(owner.address, ethers.utils.parseEther('1000000'))
        await myUSDT.mint(funder.address, ethers.utils.parseEther('1000000'))

    });

    describe('Factory', function () {

        it('can create an IDO (proxy to beacon)', async () => {
            const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
            const idoCalldata = await TutellusIDO.interface.encodeFunctionData('initialize', [myManager.address, FUNDING_AMOUNT, MIN_PREFUND]);
            const response = await myFactory.createProxy(idoCalldata)
            const receipt = await response.wait()
            myIDO = await ethers.getContractAt('TutellusIDO', receipt.events[1].args['proxy'])
            const beaconAddress = await myFactory.beacon()
            const beaconEncoded = await ethers.provider.getStorageAt(myIDO.address, _BEACON_SLOT)
            const beaconAddress2 = ethers.utils.defaultAbiCoder.decode(['address'], beaconEncoded)
            expect(beaconAddress).to.equal(beaconAddress2[0])
        });

        it('only DEFAULT_ADMIN_ROLE can create an IDO', async () => {
            const TutellusIDO = await ethers.getContractFactory('TutellusIDO')
            const idoCalldata = await TutellusIDO.interface.encodeFunctionData('initialize', [myManager.address, FUNDING_AMOUNT, MIN_PREFUND]);
            await expectRevert(
                (await myFactory.connect(funder)).createProxy(idoCalldata),
                'AccessControlProxyPausable: account ' + String(funder.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        });
    });

    describe('IDO (prefund)', function () {

        it('can prefund', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')

            const funderBalancePre = await myUSDT.balanceOf(funder.address)
            const idoBalancePre = await myUSDT.balanceOf(myIDO.address)

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).prefund(prefundAmount)
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
            await expectRevert(
                (await myIDO.connect(funder)).prefund(prefundAmount),
                'TutellusIDO: insufficient prefund'
            )
            await (await myIDO.connect(funder)).prefund(MIN_PREFUND)
            const prefunded = await myIDO.getPrefunded(funder.address)
            expect(prefunded.toString()).to.equal(MIN_PREFUND.toString())
        });

        it('reverts if prefund under minPrefund amount', async () => {
            const prefundAmount = ethers.utils.parseEther('10')
            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await expectRevert(
                (await myIDO.connect(funder)).prefund(prefundAmount),
                'TutellusIDO: insufficient prefund'
            )
            await (await myIDO.connect(funder)).prefund(MIN_PREFUND)
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
            await (await myIDO.connect(funder)).prefund(prefundAmount)
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

        it('cannot withdraw a portion (remainder under minPrefund)', async () => {
            const prefundAmount = ethers.utils.parseEther('5000')
            const withdrawAmountWrong = ethers.utils.parseEther('4901')
            const withdrawAmountRight = ethers.utils.parseEther('4900')

            await (await myUSDT.connect(funder)).approve(myIDO.address, ethers.constants.MaxUint256)
            await (await myIDO.connect(funder)).prefund(prefundAmount)
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
            await (await myIDO.connect(funder)).prefund(prefundAmount)
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
            await (await myIDO.connect(funder)).prefund(prefundAmount)
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
    });

    describe('IDO (claim)', function () {

        // it('can claim', async () => {

        // });
    });
})
