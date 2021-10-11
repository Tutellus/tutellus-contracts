const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { formatBytes32String } = require('@ethersproject/strings')
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
const ClientsVault = artifacts.require('TutellusClientsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')

let myDeployer
let myToken
let myRolemanager
let myRewardsVault
let myClientsVault
let myHoldersVault
let myTreasuryVault
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
  [myToken, myRolemanager, myRewardsVault, myClientsVault, myHoldersVault, myTreasuryVault] = await Promise.all([
    Token.at(addresses[0]),
    RoleManager.at(addresses[1]),
    RewardsVault.at(addresses[2]),
    ClientsVault.at(addresses[3]),
    HoldersVault.at(addresses[4]),
    TreasuryVault.at(addresses[5])
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
    myHoldersVault.add(owner, ether('15000'))
    myHoldersVault.add(person, ether('15000'))
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
  })
})
