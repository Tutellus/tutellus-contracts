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

describe('Farming', function () {
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
    let myFarming, myStaking
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Deposit claimed tokens from holders Vault', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      const response = await myFarming.depositFrom(person, balance)
      expectEvent(response, 'Deposit', {
        account: person,
        amount: balance
      })
    })
    it('Cannot deposit 0 tokens', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      await expectRevert(myFarming.depositFrom(person, 0), 'TutellusFarming: amount must be over zero')
    })
    it('Cannot deposit if not approved', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await expectRevert(myFarming.depositFrom(person, balance), 'TutellusFarming: amount exceeds allowance')
    })
    it('Cannot deposit more than balance', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      await expectRevert(myFarming.depositFrom(person, ether('100000')), 'TutellusFarming: user has not enough balance')
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
      await myToken.approve(myFarming.address, balance, { from: person })
      const response = await myFarming.depositFrom(person, balance)
      expectEvent(response, 'Deposit', {
        account: person,
        amount: balance
      })
      const response2 = await myFarming.withdraw(balance, { from: person })
      expectEvent(response2, 'Withdraw', {
        account: person,
        amount: ether('15000')
      })
      expectEvent(response2, 'Rewards', {
        account: person,
        amount: ether('829629.629629629629625000')
      })
      const burned = await myToken.burned()
      expect(burned.toString()).to.eq(ether('0').toString())
    })
    it('Cannot withdraw more than balance', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      await myFarming.depositFrom(person, balance)
      await expectRevert(myFarming.withdraw(ether('1000000'), { from: person }), 'TutellusFarming: user has not enough staking balance')
    })
    it('Cannot withdraw 0 tokens', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      await myFarming.depositFrom(person, balance)
      await expectRevert(myFarming.withdraw(0, { from: person }), 'TutellusFarming: amount must be over zero')
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
      await myToken.approve(myFarming.address, balance, { from: person })
      await myFarming.depositFrom(person, balance)
      const response = await myFarming.claim({ from: person })
      expectEvent(response, 'Rewards', {
        account: person,
        amount: ether('829629.629629629629625000') // 10-11 -> 1.037M * 0.8 = 829629
      })
      const response2 = await myFarming.claim({ from: person })
      expectEvent(response2, 'Rewards', {
        account: person,
        amount: ether('908641.975308641975295000') // 11-12 -> 1.135M * 0.8 = 908641
      })
    })
    it('Correct rewards for both stakers', async () => {
      await myHoldersVault.claim({ from: person })
      await myHoldersVault.claim({ from: owner })
      await myToken.approve(myFarming.address, ether('1000'), { from: person })
      await myToken.approve(myFarming.address, ether('1000'), { from: owner })
      await myFarming.depositFrom(person, ether('1000'))
      await myFarming.depositFrom(owner, ether('1000'))
      const response = await myFarming.claim({ from: person })
      expectEvent(response, 'Rewards', {
        account: person,
        amount: ether('1520987.654320987654320000') // 12-13 -> 1.234M * 0.8 (246913.58) + 13-14 -> 1.333M * 0.8 * 0.5 (133333) = 1520987
      })
    })
    it('Toggle autoreward', async () => {
      await myHoldersVault.claim({ from: person })
      await myToken.approve(myFarming.address, ether('1000'), { from: person })
      await myFarming.depositFrom(person, ether('1000'))
      await myFarming.toggleAutoreward()
      await myFarming.withdraw(ether('1000'), { from: person })
      const pending = await myFarming.pendingRewards(person)
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
      await myToken.approve(myFarming.address, balance, { from: person })
      await myFarming.depositFrom(person, ether('1000'))
      await myToken.transfer(myFarming.address, ether('14000'), { from: person })
      const gap = await myFarming.getTokenGap()
      expect(gap.toString()).to.eq(ether('14000').toString())
      const response = await myFarming.syncBalance(owner)
      expectEvent(response, 'SyncBalance', {
        account: owner,
        amount: gap
      })
    })
    it('Cant sync balance if not admin', async () => {
      await expectRevert(myFarming.syncBalance(owner, { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
    it('Cant sync balance if no gap', async () => {
      await expectRevert(myFarming.syncBalance(owner), 'TutellusFarming: there is no gap')
    })
  })
  describe('Migrate', () => {
    let myFarming, myFarming2
    beforeEach(async () => {
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      myFarming2 = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myFarming.address, [ether('100')])
      await myRewardsVault.add(myFarming2.address, [ether('20'), ether('80')])
    })
    it('Migration successful', async () => {
      await myHoldersVault.claim({ from: person })
      const balance = await myToken.balanceOf(person)
      await myToken.approve(myFarming.address, balance, { from: person })
      await myToken.approve(myFarming2.address, balance, { from: person })
      await myFarming.depositFrom(person, ether('1000'))
      await myFarming2.depositFrom(person, ether('1000'))
      const response = await myFarming.migrate(myFarming2.address, { from: person })
      expectEvent(response, 'Migrate', {
        from: myFarming.address,
        to: myFarming2.address,
        account: person,
        amount: ether('1000')
      })
    })
  })
})
