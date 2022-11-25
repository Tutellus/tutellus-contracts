const {
    ether, expectRevert, time
} = require("@openzeppelin/test-helpers")
const { ethers } = require("hardhat")
const { expect } = require("chai")
const { artifacts } = require("hardhat")
const { latestBlock } = require("@openzeppelin/test-helpers/src/time")

const Deployer = artifacts.require("TutellusDeployer")
const Token = artifacts.require("TutellusERC20")
const RoleManager = artifacts.require("TutellusRoleManager")
const Staking = artifacts.require("TutellusStaking")
const Farming = artifacts.require("TutellusFarming")
const RewardsVault = artifacts.require("TutellusRewardsVault")
const HoldersVault = artifacts.require("TutellusHoldersVault")

const S2L_FACTORY = ethers.utils.id("S2L_FACTORY")
const S2L_SIGNER_ROLE = ethers.utils.id("S2L_SIGNER_ROLE")
const S2L_RECEIVER = ethers.utils.id("S2L_RECEIVER")

const FEED_BTC_USD = ethers.utils.id("FEED_BTC_USD")
const FEED_EUR_USD = ethers.utils.id("FEED_EUR_USD")

const BTC_USD = "1700000000000"
const EUR_USD = "104000000"

const TUT_AMOUNT = ethers.utils.parseEther("60000")
const WBTC_AMOUNT = ethers.utils.parseUnits("41", 6)
const MULTIPLIER = ethers.BigNumber.from("3")

let myDeployer
let myManager
let myToken
let myRolemanager
let myRewardsVault
let myHoldersVault
let myStaking
let myFarming
let owner, person, receiver, ownerSigner, personSigner, receiverSigner
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
    const TokenFactory = await ethers.getContractFactory("Token");
    [myToken, myRolemanager, myRewardsVault, myHoldersVault] = await Promise.all([
        TokenFactory.attach(addresses[0]),
        RoleManager.at(addresses[1]),
        RewardsVault.at(addresses[2]),
        HoldersVault.at(addresses[4])
    ])
}

const getSignature = async (id, deposit, price, deadline, signer) => {
    const domain = {
        name: "TUT_S2L",
        version: "1",
        chainId: ethers.provider._network.chainId,
        verifyingContract: myFactory.address
    }

    const types = {
        Deposit: [
            { name: "id", type: "bytes32" },
            { name: "deposit", type: "uint256" },
            { name: "price", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    }

    const value = {
        id: id,
        deposit: deposit,
        price: price,
        deadline: deadline,
    }
    return await signer._signTypedData(domain, types, value)
}

const createS2L = async (id, deposit, price, deadline, userSigner, signer) => {
    const signature = await getSignature(id, deposit, price, deadline, signer)
    await myToken.connect(personSigner).approve(myFactory.address, ethers.constants.MaxUint256)
    const nonce = await ethers.provider.getTransactionCount(myFactory.address)
    const proxy = ethers.utils.getContractAddress({ from: myFactory.address, nonce: nonce })
    const maxPriceToken = await myFactory.convertFiat2Token(price)
    await expect(
        myFactory.connect(userSigner).createS2L(
            id,
            deposit,
            price,
            deadline,
            signature,
            signer.address
        )
    ).to.emit(
        myFactory, "CreateS2L"
    ).withArgs(
        id, person, proxy, deposit, price, maxPriceToken
    )
    return proxy
}

describe("Stake2Learn", function () {
    before(async () => {
        [ownerSigner, personSigner, receiverSigner] = await ethers.getSigners()
        owner = ownerSigner.address
        person = personSigner.address
        receiver = receiverSigner.address
    })
    beforeEach(async () => {
        const previous = await latestBlock()
        myDeployer = await Deployer.new(owner, previous)
        const addresses = await getAddresses()
        await setInstances(addresses)
        await myHoldersVault.add(owner, ether("6000000"))
        await myHoldersVault.add(person, ether("15000"))
        await hre.network.provider.send("hardhat_mine", ["0x1000"]);
        await myHoldersVault.claim()
        const treasury = await myDeployer.treasuryVault()
        const myTreasury = await ethers.getContractAt("TutellusTreasuryVault", treasury)
        await myTreasury.claim()
        await myToken.transfer(person, ethers.utils.parseEther("200000"))

        const Manager = await ethers.getContractFactory("TutellusManager")
        myManager = await Manager.deploy()
        await myManager.initialize()

        myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether("0.1"), ether("10"), 10)
        myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
        await myRewardsVault.add(myStaking.address, [ether("100")])
        await myRewardsVault.add(myFarming.address, [ether("20"), ether("80")])

        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory")
        const UniswapRouter = await ethers.getContractFactory("UniswapRouter")
        const WBTC = await ethers.getContractFactory("WBTC")
        const WETH = await ethers.getContractFactory("WETH")
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
        myUniswapPair = await ethers.getContractAt("IUniswapV2Pair", pairAddress)

        const AggregatorMock = await hre.ethers.getContractFactory("AggregatorMock")
        const btcUsdCalldata = AggregatorMock.interface.encodeFunctionData("initialize", ["8", BTC_USD]);
        const eurUsdCalldata = AggregatorMock.interface.encodeFunctionData("initialize", ["8", EUR_USD]);
        await myManager.deploy(FEED_BTC_USD, AggregatorMock.bytecode, btcUsdCalldata)
        await myManager.deploy(FEED_EUR_USD, AggregatorMock.bytecode, eurUsdCalldata)
        const btcUsdFeed = await myManager.get(FEED_BTC_USD)
        const eurUsdFeed = await myManager.get(FEED_EUR_USD)
        const feeds = [btcUsdFeed, eurUsdFeed]
        const inverts = [false, true]

        const TutellusStake2LearnFactory = await ethers.getContractFactory("TutellusStake2LearnFactory")
        const TutellusStake2Learn = await ethers.getContractFactory("TutellusStake2Learn")
        const implementation = await TutellusStake2Learn.deploy()
        const initializeCalldata = TutellusStake2LearnFactory.interface.encodeFunctionData("initialize", [
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
        await myManager.setId(S2L_RECEIVER, receiver)
    })
    describe("Create", () => {
        it("createS2L", async () => {
            const id = ethers.utils.id("bootcamp01")
            const price = ethers.utils.parseEther("5100")
            const tokenAmount = await myFactory.convertFiat2Token(price)
            const deposit = tokenAmount.mul(MULTIPLIER)
            const deadline = "5393044017"
            const s2lAddress = await createS2L(id, deposit, price, deadline, personSigner, ownerSigner)
            const myS2L = await ethers.getContractAt("TutellusStake2Learn", s2lAddress)

            expect(await myS2L.token()).to.equal(myToken.address)
            expect(await myS2L.stakingContract()).to.equal(myStaking.address)
            expect(await myS2L.factory()).to.equal(myFactory.address)
            expect((await myS2L.priceFiat()).toString()).to.equal(price.toString())
            expect((await myS2L.maxPriceToken()).toString()).to.equal(tokenAmount.toString())
            expect((await myS2L.payAmount()).toString()).to.equal(tokenAmount.toString())
            expect((await myStaking.getUserBalance(myS2L.address)).toString()).to.equal(deposit.toString())
        })
    })
    describe("ClaimAndDeposit", () => {
        it("claimAndDeposit", async () => {
            const id = ethers.utils.id("bootcamp01")
            const price = ethers.utils.parseEther("5100")
            const tokenAmount = await myFactory.convertFiat2Token(price)
            const deposit = tokenAmount.mul(MULTIPLIER)
            const deadline = "5393044017"
            const s2lAddress = await createS2L(id, deposit, price, deadline, personSigner, ownerSigner)
            const myS2L = await ethers.getContractAt("TutellusStake2Learn", s2lAddress)
            await hre.network.provider.send("hardhat_mine", ["0x100"]);
            const claimable1 = await myStaking.pendingRewards(myS2L.address)
            const deposit1 = await myStaking.getUserBalance(myS2L.address)
            await myS2L.claimAndDeposit()
            const claimable2 = await myStaking.pendingRewards(myS2L.address)
            const deposit2 = await myStaking.getUserBalance(myS2L.address)
            const total = ethers.BigNumber.from(deposit1.toString()).add(ethers.BigNumber.from(claimable1.toString()))
            expect(parseFloat(ethers.utils.formatEther(deposit2.toString()))).gte(parseFloat(ethers.utils.formatEther(total.toString())))
            expect(claimable2.toString()).to.equal("0")
        })
    })
    describe("Withdraw", () => {
        it("withdraw", async () => {
            const id = ethers.utils.id("bootcamp01")
            const price = ethers.utils.parseEther("5100")
            const tokenAmount = await myFactory.convertFiat2Token(price)
            const deposit = tokenAmount.mul(MULTIPLIER)
            const deadline = "5393044017"
            const s2lAddress = await createS2L(id, deposit, price, deadline, personSigner, ownerSigner)
            const myS2L = await ethers.getContractAt("TutellusStake2Learn", s2lAddress)
            await hre.network.provider.send("hardhat_mine", ["0x100"]);
            expect(await myS2L.canWithdraw()).to.equal(true)
            const payAmount = await myS2L.payAmount()
            await expect(
                myS2L.withdraw()
            ).to.be.revertedWith(
                "Ownable: caller is not the owner"
            )
            await myS2L.connect(personSigner).withdraw()
            const payed = await myToken.balanceOf(receiver)
            expect(payAmount.toString()).to.equal(payed.toString())
        })
    })
    describe("Getters", () => {
        it("token", async () => {
            expect(await myFactory.token()).to.equal(myToken.address)
        })
        it("poolAddress", async () => {
            expect(await myFactory.poolAddress()).to.equal(myUniswapPair.address)
        })
        it("stakingContract", async () => {
            expect(await myFactory.stakingContract()).to.equal(myStaking.address)
        })
    })
})
