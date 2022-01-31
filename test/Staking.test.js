const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('TutellusRoleManager')
const Staking = artifacts.require('TutellusStaking')
const Farming = artifacts.require('TutellusFarming')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')

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
      const response = await myStaking.depositFrom(person, balance)
      expectEvent(response, 'Deposit', {
        account: person,
        amount: balance
      })
      const response2 = await myStaking.withdraw(balance, { from: person }) // 1 block -> fee = 9% of 15000 -> 13650
      expectEvent(response2, 'Withdraw', {
        account: person,
        amount: ether('13650'),
        burned: ether('1350')
      })
      expectEvent(response2, 'Rewards', {
        account: person,
        amount: ether('207407.407407407407395000')
      })
      const burned = await myToken.burned()
      expect(burned.toString()).to.eq(ether('1350').toString())
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
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, ether('1000'))
      await myStaking.depositFrom(person, ether('14000'))
      const userBalance = await myStaking.getUserBalance(person)
      const response = await myStaking.withdraw(userBalance, { from: person })
      expectEvent(response, 'Withdraw', {
        account: person,
        amount: ether('13650'),
        burned: ether('1350')
      })
    })
    it('Fees do not change for previous deposits', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, balance)
      await myStaking.setFees(ether('0.5'), ether('20'))
      await myStaking.setFeeInterval(100)
      const response = await myStaking.withdraw(balance, { from: person })
      expectEvent(response, 'Withdraw', {
        account: person,
        amount: ether('13950'),
        burned: ether('1050')
      })
    })
    it('Fees change for new deposits', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, ether('10000'))
      await myStaking.setFees(ether('1'), ether('20'))
      await myStaking.setFeeInterval(0)
      await myStaking.depositFrom(person, ether('5000'))
      const response = await myStaking.withdraw(balance, { from: person })
      expectEvent(response, 'Withdraw', {
        account: person,
        amount: ether('14850'),
        burned: ether('150')
      })
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
      const response = await myStaking.claim({ from: person })
      expectEvent(response, 'Rewards', {
        account: person,
        amount: ether('207407.407407407407395000') // 10-11 -> 1.037M * 0.2 = 207407
      })
      const response2 = await myStaking.claim({ from: person })
      expectEvent(response2, 'Rewards', {
        account: person,
        amount: ether('227160.493827160493820000') // 11-12 -> 1.135M * 0.2 = 227160
      })
    })
    it('Correct rewards for both stakers', async () => {
      await myHoldersVault.claim({ from: person })
      await myHoldersVault.claim({ from: owner })
      await myToken.approve(myStaking.address, ether('1000'), { from: person })
      await myToken.approve(myStaking.address, ether('1000'), { from: owner })
      await myStaking.depositFrom(person, ether('1000'))
      await myStaking.depositFrom(owner, ether('1000'))
      const response = await myStaking.claim({ from: person })
      expectEvent(response, 'Rewards', {
        account: person,
        amount: ether('380246.913580246913579000') // 12-13 -> 1.234M * 0.2 (246913.58) + 13-14 -> 1.333M * 0.2 * 0.5 (133333) = 380246.913
      })
    })
    it('Toggle autoreward', async () => {
      await myHoldersVault.claim({ from: person })
      await myToken.approve(myStaking.address, ether('1000'), { from: person })
      await myStaking.depositFrom(person, ether('1000'))
      await myStaking.toggleAutoreward()
      await myStaking.withdraw(ether('1000'), { from: person })
      const pending = await myStaking.pendingRewards(person)
      expect(pending.toString()).to.not.eq('0')
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
      await myToken.approve(myStaking.address, balance, { from: person })
      await myStaking.depositFrom(person, ether('1000'))
      await myToken.transfer(myStaking.address, ether('14000'), { from: person })
      const gap = await myStaking.getTokenGap()
      expect(gap.toString()).to.eq(ether('14000').toString())
      const response = await myStaking.syncBalance(owner)
      expectEvent(response, 'SyncBalance', {
        account: owner,
        amount: gap
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
      await myStaking.depositFrom(person, ether('1000'))
      await myStaking2.depositFrom(person, ether('1000'))
      const response = await myStaking.migrate(myStaking2.address, { from: person })
      expectEvent(response, 'Migrate', {
        from: myStaking.address,
        to: myStaking2.address,
        account: person,
        amount: ether('920')
      })
    })
  })
})
