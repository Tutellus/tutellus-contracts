const {
  ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { fromEther } = require('../../utils/shared')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('TutellusRoleManager')
const Staking = artifacts.require('TutellusStaking')
const Farming = artifacts.require('TutellusFarming')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')

const ONE_ETHER = ether('1')
const TWO_ETHER = ether('2')

let myDeployer
let myToken
let myRolemanager
let myRewardsVault
let myHoldersVault
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
  [myToken, myRolemanager, myRewardsVault, myHoldersVault] = await Promise.all([
    Token.at(addresses[0]),
    RoleManager.at(addresses[1]),
    RewardsVault.at(addresses[2]),
    HoldersVault.at(addresses[4])
  ])
}

describe('Staking', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const previous = await latestBlock()
    myDeployer = await Deployer.new(owner, previous)
    const addresses = await getAddresses()
    await setInstances(addresses)
    await myHoldersVault.add(owner, ether('15000'))
    await myHoldersVault.add(person, ether('15000'))
  })
  describe('Deposit', () => {
    let myStaking, myFarming
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Deposit claimed tokens from holders Vault', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      const response = await myStaking.depositFrom(person, balance)
      expectEvent(response, 'Deposit', {
        account: person,
        amount: balance
      })
    })
    it('Cannot deposit 0 tokens', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await expectRevert(myStaking.depositFrom(person, 0), 'TutellusStaking: amount must be over zero')
    })
    it('Cannot deposit if not approved', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await expectRevert(myStaking.depositFrom(person, balance), 'TutellusStaking: amount exceeds allowance')
    })
    it('Cannot deposit more than balance', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await expectRevert(myStaking.depositFrom(person, ether('100000')), 'TutellusStaking: user has not enough balance')
    })
  })
  describe('Withdraw', () => {
    let myStaking, myFarming
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Deposit and withdraw', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await myStaking.withdraw(balance, { from: person }) // 1 block -> fee = 9% of 15000 -> 13650
      const burned = await myToken.burned()
      expect(fromEther(burned)).gt(0)
    })
    it('Cannot withdraw more than balance', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await expectRevert(myStaking.withdraw(ether('1000000'), { from: person }), 'TutellusStaking: user has not enough staking balance')
    })
    it('Cannot withdraw 0 tokens', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await expectRevert(myStaking.withdraw(0, { from: person }), 'TutellusStaking: amount must be over zero')
    })
  })
  describe('Fees', () => {
    let myStaking, myFarming
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Fees reset after deposit', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      const halfBalance = balance.mul(ONE_ETHER).div(TWO_ETHER)

      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, halfBalance)
      const blocks0 = await myStaking.getBlocksLeft(person)

      await myStaking.depositFrom(person, halfBalance)
      const blocks1 = await myStaking.getBlocksLeft(person)
      expect(blocks0.toString()).eq(blocks1.toString())
    })
    it('Fees do not change for previous deposits', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      const MIN_FEE = ether('0')
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await myStaking.setFees(MIN_FEE, ether('20'))
      await myStaking.setFeeInterval(0)
      await myStaking.withdraw(balance, { from: person })
      const post = await myToken.balanceOf(person)
      expect(fromEther(post)).lt(fromEther(balance))
    })
    it('Fees change for new deposits', async () => {
      await myHoldersVault.claim({ from: person })
      const MIN_FEE = ether('0')
      const balancePerson = await myToken.balanceOf(person)
      const balanceOwner = await myToken.balanceOf(owner)

      await myStaking.toggleAutoreward()

      await myToken.approve(myStaking.address, balancePerson, { from: person })
      await myToken.approve(myStaking.address, balanceOwner, { from: owner })

      await myStaking.depositFrom(person, balancePerson)

      await myStaking.setFees(MIN_FEE, ether('20'))
      await myStaking.setFeeInterval(0)

      await myStaking.depositFrom(owner, balanceOwner)

      await myStaking.withdraw(balancePerson, { from: person })
      await myStaking.withdraw(balanceOwner, { from: owner })

      const [postPerson, postOwner] = await Promise.all([
        myToken.balanceOf(person),
        myToken.balanceOf(owner)
      ])

      expect(fromEther(postPerson)).lt(fromEther(balancePerson))
      expect(fromEther(postOwner)).eq(fromEther(balanceOwner))

    })
    it('setFees() revert', async () => {
      await expectRevert(myStaking.setFees(ether('100'), ether('0')), 'TutellusStaking: mininum fee must be greater or equal than maximum fee')
      await expectRevert(myStaking.setFees(ether('0'), ether('1000')), 'TutellusStaking: fees must be less than 100e18')
      await expectRevert(myStaking.setFees(ether('0'), ether('1000'), { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
      await expectRevert(myStaking.setFeeInterval(0, { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
  })
  describe('Rewards', () => {
    let myStaking, myFarming
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Correct rewards claiming after deposit', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await myStaking.claim({ from: person })
      const balancePost = await myToken.balanceOf(person)
      expect(fromEther(balancePost)).gt(0)
    })
    it('Correct rewards for both stakers', async () => {
      await myHoldersVault.claim({ from: person })
      await myHoldersVault.claim({ from: owner })
      
      await myToken.transfer(person, ether('10000'))

      const [balancePerson, balanceOwner] = await Promise.all([
        myToken.balanceOf(person),
        myToken.balanceOf(owner)
      ])

      await myToken.approve(myStaking.address, balancePerson, { from: person })
      await myToken.approve(myStaking.address, balanceOwner, { from: owner })
      await myStaking.depositFrom(person, balancePerson)
      await myStaking.depositFrom(owner, balanceOwner)
      
      const totalBalance = await myStaking.balance()

      const sharePerson = balancePerson.mul(ONE_ETHER).div(totalBalance)
      const shareOwner = balanceOwner.mul(ONE_ETHER).div(totalBalance)

      const gap = await myStaking.pendingRewards(person)

      await time.advanceBlock()

      const [pendingPerson0, pendingOwner] = await Promise.all([
        myStaking.pendingRewards(person),
        myStaking.pendingRewards(owner)
      ])

      const pendingPerson = pendingPerson0.sub(gap)

      const totalRewards = pendingOwner.add(pendingPerson)

      expect(fromEther(totalRewards.mul(sharePerson).div(ONE_ETHER))).approximately(fromEther(pendingPerson), 1e-17)
      expect(fromEther(totalRewards.mul(shareOwner).div(ONE_ETHER))).approximately(fromEther(pendingOwner), 1e-17)
    })
    it('Toggle autoreward', async () => {
      await myStaking.toggleAutoreward()
      const at = await myStaking.autoreward()
      expect(at).eq(false)
    })
  })
  describe('Sync balance', () => {
    let myStaking, myFarming
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Sync balance successful', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      const halfBalance = balance.mul(ONE_ETHER).div(TWO_ETHER)
      await myToken.approve(myStaking.address, halfBalance, { from: person })
      await myStaking.depositFrom(person, halfBalance)
      await myToken.transfer(myStaking.address, halfBalance, { from: person })
      const gap = await myStaking.getTokenGap()
      expect(gap.toString()).to.eq(halfBalance.toString())
      const response = await myStaking.syncBalance(owner)
      expectEvent(response, 'SyncBalance', {
        account: owner,
        amount: halfBalance.toString()
      })
    })
    it('Cant sync balance if not admin', async () => {
      await expectRevert(myStaking.syncBalance(owner, { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
    it('Cant sync balance if no gap', async () => {
      await expectRevert(myStaking.syncBalance(owner), 'TutellusStaking: there is no gap')
    })
  })
  describe('Migrate', () => {
    let myStaking, myStaking2
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myStaking2 = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.5'), ether('20'), 20)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myStaking2.address, [ether('20'), ether('80')])
    })
    it('Migration successful', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myToken.approve(myStaking2.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      const response = await myStaking.migrate(myStaking2.address, { from: person })
      expectEvent(response, 'Migrate', {
        from: myStaking.address,
        to: myStaking2.address,
        account: person
      })
    })
  })
})
