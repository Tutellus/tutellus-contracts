const {
    ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const { ethers } = require('hardhat')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('TutellusRoleManager')
const Staking = artifacts.require('TutellusStaking')
const Farming = artifacts.require('TutellusFarming')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')

const S2L_FACTORY = ethers.utils.id("S2L_FACTORY")
const S2L_SIGNER_ROLE = ethers.utils.id("S2L_SIGNER_ROLE")

const FEED_BTC_USD = ethers.utils.id('FEED_BTC_USD')
const FEED_EUR_USD = ethers.utils.id('FEED_EUR_USD')

const BTC_USD = '1700000000000'
const EUR_USD = '104000000'

const TUT_AMOUNT = ethers.utils.parseEther('60000')
const WBTC_AMOUNT = ethers.utils.parseUnits('41', 6)
const MULTIPLIER = ethers.BigNumber.from("3")

let myDeployer
let myManager
let myToken
let myRolemanager
let myRewardsVault
let myHoldersVault
let myStaking
let myFarming
let owner, person, ownerSigner, personSigner
let myFactory
let myUniswapFactory, myWBTC, myWETH

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
    const TokenFactory = await ethers.getContractFactory('Token');
    [myToken, myRolemanager, myRewardsVault, myHoldersVault] = await Promise.all([
        TokenFactory.attach(addresses[0]),
        RoleManager.at(addresses[1]),
        RewardsVault.at(addresses[2]),
        HoldersVault.at(addresses[4])
    ])
}

describe('Stake2Learn', function () {
    before(async () => {
        [ownerSigner, personSigner] = await ethers.getSigners()
        owner = ownerSigner.address
        person = personSigner.address
    })
    beforeEach(async () => {
        const previous = await latestBlock()
        myDeployer = await Deployer.new(owner, previous)
        const addresses = await getAddresses()
        await setInstances(addresses)
        await myHoldersVault.add(owner, ether('6000000'))
        await myHoldersVault.add(person, ether('15000'))
        await hre.network.provider.send("hardhat_mine", ["0x1000"]);
        await myHoldersVault.claim()
        const treasury = await myDeployer.treasuryVault()
        const myTreasury = await ethers.getContractAt("TutellusTreasuryVault", treasury)
        await myTreasury.claim()
        await myToken.transfer(person, ethers.utils.parseEther("200000"))

        const Manager = await ethers.getContractFactory('TutellusManager')
        myManager = await Manager.deploy()
        await myManager.initialize()

        myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
        myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
        await myRewardsVault.add(myStaking.address, [ether('100')])
        await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])

        const UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory')
        const UniswapRouter = await ethers.getContractFactory('UniswapRouter')
        const WBTC = await ethers.getContractFactory('WBTC')
        const WETH = await ethers.getContractFactory('WETH')
        myUniswapFactory = await UniswapV2Factory.deploy(owner)
        myWETH = await WETH.deploy()
        myRouter = await UniswapRouter.deploy(myUniswapFactory.address, myWETH.address)
        myWBTC = await WBTC.deploy("Wrapped BTC", "WBTC")
        await myToken.approve(myRouter.address, ethers.constants.MaxUint256)
        await myWBTC.approve(myRouter.address, ethers.constants.MaxUint256)

        await myRouter.addLiquidity(
            myToken.address,
            myWBTC.address,
            TUT_AMOUNT,
            WBTC_AMOUNT,
            TUT_AMOUNT,
            WBTC_AMOUNT,
            owner,
            Date.now()
        )

        const pairAddress = await myUniswapFactory.getPair(myToken.address, myWBTC.address)
        myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress)

        const AggregatorMock = await hre.ethers.getContractFactory('AggregatorMock')
        const btcUsdCalldata = AggregatorMock.interface.encodeFunctionData('initialize', ['8', BTC_USD]);
        const eurUsdCalldata = AggregatorMock.interface.encodeFunctionData('initialize', ['8', EUR_USD]);
        await myManager.deploy(FEED_BTC_USD, AggregatorMock.bytecode, btcUsdCalldata)
        await myManager.deploy(FEED_EUR_USD, AggregatorMock.bytecode, eurUsdCalldata)
        const btcUsdFeed = await myManager.get(FEED_BTC_USD)
        const eurUsdFeed = await myManager.get(FEED_EUR_USD)
        const feeds = [btcUsdFeed, eurUsdFeed]
        const inverts = [false, true]

        const TutellusStake2LearnFactory = await ethers.getContractFactory('TutellusStake2LearnFactory')
        const TutellusStake2Learn = await ethers.getContractFactory('TutellusStake2Learn')
        const implementation = await TutellusStake2Learn.deploy()
        const initializeCalldata = TutellusStake2LearnFactory.interface.encodeFunctionData('initialize', [
            implementation.address,
            myToken.address,
            myUniswapPair.address,
            myStaking.address,
            feeds,
            inverts
        ])
        const factoryImplementation = await TutellusStake2LearnFactory.deploy()
        await myManager.deployProxyWithImplementation(S2L_FACTORY, factoryImplementation.address, initializeCalldata)
        const factoryAddress = await myManager.get(S2L_FACTORY)
        myFactory = TutellusStake2LearnFactory.attach(factoryAddress)

        await myManager.grantRole(S2L_SIGNER_ROLE, owner)
    })
    describe('Getters', () => {
        beforeEach(async () => {

        })
        it('token', async () => {
            expect(await myFactory.token()).to.equal(myToken.address)
        })
        it('poolAddress', async () => {
            expect(await myFactory.poolAddress()).to.equal(myUniswapPair.address)
        })
        it('stakingContract', async () => {
            expect(await myFactory.stakingContract()).to.equal(myStaking.address)
        })
        it('createS2L', async () => {
            const id = ethers.utils.id("bootcamp01")
            const price = ethers.utils.parseEther("5100")
            const tokenAmount = await myFactory.convertFiat2Token(price)
            const depositAmount = tokenAmount.mul(MULTIPLIER)
            const deadline = "5393044017"
            const signer = owner

            const domain = {
                name: 'TUT_S2L',
                version: '1',
                chainId: ethers.provider._network.chainId,
                verifyingContract: myFactory.address
            }

            const types = {
                Deposit: [
                    { name: 'id', type: 'bytes32' },
                    { name: 'deposit', type: 'uint256' },
                    { name: 'price', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' }
                ]
            }

            const value = {
                id: id,
                deposit: depositAmount,
                price: price,
                deadline,
            }
            const signature = await ownerSigner._signTypedData(domain, types, value)
            await myToken.connect(personSigner).approve(myFactory.address, ethers.constants.MaxUint256)
            await myFactory.connect(personSigner).createS2L(
                id,
                depositAmount,
                price,
                deadline,
                signature,
                signer
            )
        })
    })
})
