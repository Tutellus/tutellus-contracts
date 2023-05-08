const {
    ether, expectRevert, time
} = require("@openzeppelin/test-helpers")
const { ethers } = require("hardhat")
const { expect } = require("chai")
const { artifacts } = require("hardhat")
const { latestBlock } = require("@openzeppelin/test-helpers/src/time")
const { formatEther, parseEther, id } = require('ethers/lib/utils')

const Deployer = artifacts.require("TutellusDeployer")
const Token = artifacts.require("TutellusERC20")
const RoleManager = artifacts.require("TutellusRoleManager")
const RewardsVault = artifacts.require("TutellusRewardsVault")
const HoldersVault = artifacts.require("TutellusHoldersVault")

const SUPERTUTELLIANS = ethers.utils.id("SUPERTUTELLIANS")
const ST_ADMIN_ROLE = ethers.utils.id("ST_ADMIN_ROLE")
const UPGRADER_ROLE = ethers.utils.id('UPGRADER_ROLE')
const ERC20 = ethers.utils.id('ERC20')
const REWARDS_MANAGER_ROLE = ethers.utils.id('REWARDS_MANAGER_ROLE')
const REWARDS_ID = ethers.utils.id('SUPERTUTELLIANS_REWARDS')

const MIN_DEPOSIT_AMOUNT = parseEther("25000")
const MAX_DEPOSIT_AMOUNT = parseEther("60000")

let myDeployer
let myManager
let myToken
let mySupertutellians
let myRewardsVaultV2
let myRolemanager
let myRewardsVault
let myHoldersVault
let owner, person, supertutellian, ownerSigner, personSigner, supertutellianSigner

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

describe.only("Supertutellians", function () {
    before(async () => {
        [ownerSigner, personSigner, supertutellianSigner] = await ethers.getSigners()
        owner = ownerSigner.address
        person = personSigner.address
        supertutellian = supertutellianSigner.address
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
        await myManager.setId(ERC20, myToken.address)

        const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
        const initializeCalldata = RewardsVaultV2.interface.encodeFunctionData("initialize", [])
        await myManager.deploy(REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
        const rvv2 = await myManager.get(REWARDS_ID)
        myRewardsVaultV2 = RewardsVaultV2.attach(rvv2)
        await myToken.transfer(myRewardsVaultV2.address, ethers.utils.parseEther("10000"))
        await myManager.grantRole(REWARDS_MANAGER_ROLE, owner)
        await myRewardsVaultV2.setRewardPerBlock(parseEther('1'))

        const Supertutellians = await ethers.getContractFactory("Supertutellians")
        const implementation = await Supertutellians.deploy()
        await myManager.deployProxyWithImplementation(SUPERTUTELLIANS, implementation.address, initializeCalldata)
        const supertutelliansAddress = await myManager.get(SUPERTUTELLIANS)
        mySupertutellians = Supertutellians.attach(supertutelliansAddress)

        await myRewardsVaultV2.add(mySupertutellians.address, [parseEther('100')])

        await myManager.grantRole(ST_ADMIN_ROLE, owner)
        await myManager.grantRole(UPGRADER_ROLE, owner)
    })
    describe("Deposit and mint", () => {
        it("can deposit and mint", async () => {
            mySupertutellians = mySupertutellians.connect(personSigner)
            myToken = myToken.connect(personSigner)
            await myToken.approve(mySupertutellians.address, MAX_DEPOSIT_AMOUNT)
            await mySupertutellians.deposit(person, MAX_DEPOSIT_AMOUNT)
            const tokenId = "0"
            const stakingBalance = await mySupertutellians.balance()
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const ownerOfToken = await mySupertutellians.ownerOf(tokenId)
            expect(stakingBalance.toString()).to.equal(MAX_DEPOSIT_AMOUNT.toString())
            expect(nftData.balance.toString()).to.equal(MAX_DEPOSIT_AMOUNT.toString())
            expect(nftData.minter).to.equal(person)
            expect(ownerOfToken).to.equal(person)
        })
        it("can deposit and mint under minDepositAmount if whitelisted", async () => {
            const minDepositAmount = parseEther("15000")
            await myToken.connect(personSigner).transfer(supertutellian, minDepositAmount)
            await mySupertutellians.setMinDepositAmounts([supertutellian], [minDepositAmount])
            mySupertutellians = mySupertutellians.connect(supertutellianSigner)
            myToken = myToken.connect(supertutellianSigner)
            await myToken.approve(mySupertutellians.address, minDepositAmount)
            await mySupertutellians.deposit(supertutellian, minDepositAmount)
            const tokenId = "0"
            const stakingBalance = await mySupertutellians.balance()
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const ownerOfToken = await mySupertutellians.ownerOf(tokenId)
            expect(stakingBalance.toString()).to.equal(minDepositAmount.toString())
            expect(nftData.balance.toString()).to.equal(minDepositAmount.toString())
            expect(nftData.minter).to.equal(supertutellian)
            expect(ownerOfToken).to.equal(supertutellian)
        })
    })
    describe("Claim", () => {
        const tokenId = "0"
        beforeEach(async () => {
            mySupertutellians = mySupertutellians.connect(personSigner)
            myToken = myToken.connect(personSigner)
            await myToken.approve(mySupertutellians.address, MAX_DEPOSIT_AMOUNT)
            await mySupertutellians.deposit(person, MAX_DEPOSIT_AMOUNT)
        })
        it("can claim", async () => {
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const lockTime = await mySupertutellians.LOCK_TIME()
            const claimDate = parseInt(nftData.mintDate) + parseInt(lockTime) + 1
            await ethers.provider.send("evm_setNextBlockTimestamp", [claimDate])
            const pending = await mySupertutellians.pendingRewards(tokenId)
            const balancePre = await myToken.balanceOf(person)
            await mySupertutellians.connect(personSigner).claim(tokenId)
            const balancePost = await myToken.balanceOf(person)
            const pendingBN = ethers.BigNumber.from(pending.toString())
            const balancePreBN = ethers.BigNumber.from(balancePre.toString())
            const balancePostBN = ethers.BigNumber.from(balancePost.toString())
            expect(parseFloat(ethers.utils.formatEther(balancePostBN))).to.be.greaterThanOrEqual(parseFloat(ethers.utils.formatEther(balancePreBN.add(pendingBN))))
        })
        it("can claim after transfer", async () => {
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const lockTime = await mySupertutellians.LOCK_TIME()
            const claimDate = parseInt(nftData.mintDate) + parseInt(lockTime) + 1
            await ethers.provider.send("evm_setNextBlockTimestamp", [claimDate])
            const pending = await mySupertutellians.pendingRewards(tokenId)
            await mySupertutellians.connect(personSigner).transferFrom(person, supertutellian, tokenId)
            await mySupertutellians.connect(supertutellianSigner).claim(tokenId)
            const balancePost = await myToken.balanceOf(supertutellian)
            const pendingBN = ethers.BigNumber.from(pending.toString())
            const balancePostBN = ethers.BigNumber.from(balancePost.toString())
            expect(parseFloat(ethers.utils.formatEther(balancePostBN))).to.be.greaterThanOrEqual(parseFloat(ethers.utils.formatEther(pendingBN)))
        })
    })
    describe("Withdraw and burn", () => {
        const tokenId = "0"
        beforeEach(async () => {
            mySupertutellians = mySupertutellians.connect(personSigner)
            myToken = myToken.connect(personSigner)
            await myToken.approve(mySupertutellians.address, MAX_DEPOSIT_AMOUNT)
            await mySupertutellians.deposit(person, MAX_DEPOSIT_AMOUNT)
        })
        it("can withdraw", async () => {
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const lockTime = await mySupertutellians.LOCK_TIME()
            const withdrawDate = parseInt(nftData.mintDate) + parseInt(lockTime) + 1
            await ethers.provider.send("evm_setNextBlockTimestamp", [withdrawDate])
            await mySupertutellians.connect(personSigner).claim(tokenId)
            const balancePre = await myToken.balanceOf(person)
            const balancePreBN = ethers.BigNumber.from(balancePre.toString())
            await mySupertutellians.connect(personSigner).withdraw(tokenId)
            const balancePost = await myToken.balanceOf(person)
            const balancePostBN = ethers.BigNumber.from(balancePost.toString())
            const depositedBN = ethers.BigNumber.from(nftData.balance.toString())
            expect(parseFloat(ethers.utils.formatEther(balancePostBN))).to.be.greaterThanOrEqual(parseFloat(ethers.utils.formatEther(balancePreBN.add(depositedBN))))
        })
        it("can withdraw after transfer", async () => {
            const nftData = await mySupertutellians.supertutellians(tokenId)
            const lockTime = await mySupertutellians.LOCK_TIME()
            const withdrawDate = parseInt(nftData.mintDate) + parseInt(lockTime) + 1
            await ethers.provider.send("evm_setNextBlockTimestamp", [withdrawDate])
            await mySupertutellians.connect(personSigner).claim(tokenId)
            await mySupertutellians.connect(personSigner).transferFrom(person, supertutellian, tokenId)
            await mySupertutellians.connect(supertutellianSigner).withdraw(tokenId)
            const balancePost = await myToken.balanceOf(supertutellian)
            const balancePostBN = ethers.BigNumber.from(balancePost.toString())
            const depositedBN = ethers.BigNumber.from(nftData.balance.toString())
            expect(parseFloat(ethers.utils.formatEther(balancePostBN))).to.be.greaterThanOrEqual(parseFloat(ethers.utils.formatEther(depositedBN)))
        })
    })
})
