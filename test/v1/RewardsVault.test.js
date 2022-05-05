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

let myDeployer
let myToken
let myRolemanager
let myRewardsVault
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
  [myToken, myRolemanager, myRewardsVault] = await Promise.all([
    Token.at(addresses[0]),
    RoleManager.at(addresses[1]),
    RewardsVault.at(addresses[2])
  ])
}

describe('RewardsVault', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const previous = await latestBlock()
    myDeployer = await Deployer.new(owner, previous)
    const addresses = await getAddresses()
    await setInstances(addresses)
  })
  describe('Setup', () => {
    it('Adding Staking and Farming correctly', async () => {
      const myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      const myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Error: allocation over 100', async () => {
      const myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      const myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await expectRevert(myRewardsVault.add(myFarming.address, [ether('20'), ether('85')]), 'TutellusRewardsVault: total allocation must be 1e20')
    })
    it('Error: allocation under 100', async () => {
      const myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await expectRevert(myRewardsVault.add(myFarming.address, [ether('20')]), 'TutellusRewardsVault: total allocation must be 1e20')
    })
  })
  describe('Add', () => {
    let myFarming, myStaking
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Can add another staking', async () => {
      const myStaking2 = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('1'), ether('20'), 15)
      const response = await myRewardsVault.add(myStaking2.address, [ether('0'), ether('80'), ether('20')])
      expectEvent(response, 'Add', {
        account: myStaking2.address
      })
    })
    it('Cant add if not admin', async () => {
      const myStaking2 = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('1'), ether('20'), 15)
      await expectRevert(myRewardsVault.add(myStaking2.address, [ether('0'), ether('80'), ether('20')], { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
  })
  describe('Update', () => {
    let myFarming, myStaking
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Can update allocation', async () => {
      await myRewardsVault.updateAllocation([ether('10'), ether('90')])
    })
    it('Cant update allocation if not admin', async () => {
      await expectRevert(myRewardsVault.updateAllocation([ether('10'), ether('90')], { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
  })
  describe('Releasing', () => {
    let myFarming, myStaking
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('released()', async () => {
      const response = await myRewardsVault.released()

    })
    it('releasedId()', async () => {

      const gapS = await myRewardsVault.releasedId(myStaking.address)
      const gapF = await myRewardsVault.releasedId(myFarming.address)

      await time.advanceBlock()

      const [releasedS0, releasedF0, infoS, infoF] = await Promise.all([
        myRewardsVault.releasedId(myStaking.address),
        myRewardsVault.releasedId(myFarming.address),
        myRewardsVault.info(myStaking.address),
        myRewardsVault.info(myFarming.address)
      ])

      const releasedS = releasedS0.sub(gapS);
      const releasedF = releasedF0.sub(gapF);

      const totalReleased = releasedS.add(releasedF);
      const allocationS = infoS.allocation;
      const allocationF = infoF.allocation;

      expect(fromEther(releasedS)).approximately(fromEther(totalReleased.mul(allocationS).div(ether('100'))), 1e-17)
      expect(fromEther(releasedF)).approximately(fromEther(totalReleased.mul(allocationF).div(ether('100'))), 1e-17)

    })
    it('availableId()', async () => {
      const distributed = (await myRewardsVault.info(myStaking.address)).distributed
      const ava = await myRewardsVault.availableId(myStaking.address)
      const rel = await myRewardsVault.releasedId(myStaking.address)

      expect(fromEther(ava)).eq(fromEther(rel.sub(distributed)))
    })
  })
  describe('Distribute tokens', () => {
    let myStaking
    beforeEach(async () => {
      myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(owner, [ether('20'), ether('80')])
    })
    it('Can distribute tokens', async () => {
      const released = await myRewardsVault.releasedId(owner)
      const response = await myRewardsVault.distributeTokens(person, released)
      expectEvent(response, 'DistributeTokens', {
        sender: owner,
        account: person,
        amount: released
      })
    })
    it('Cannot distribute more tokens than available', async () => {
      const released = await myRewardsVault.released()
      await expectRevert(myRewardsVault.distributeTokens(person, released), 'TutellusRewardsVault: amount exceeds available')
    })
    it('Cannot distribute tokens if sender not allowed', async () => {
      await time.advanceBlock()
      const released = await myRewardsVault.availableId(owner)
      await expectRevert(myRewardsVault.distributeTokens(owner, released, { from: person }), 'TutellusRewardsVault: amount exceeds available')
    })
  })
})
