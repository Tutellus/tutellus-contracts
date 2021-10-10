const {
  ether
} = require('@openzeppelin/test-helpers')
const { formatBytes32String } = require('@ethersproject/strings')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('IAccessControlUpgradeable')
const Staking = artifacts.require('TutellusStaking')
const Farming = artifacts.require('TutellusFarming')
const FarmingVault = artifacts.require('TutellusYFRewardsVault')
const RewardsVault = artifacts.require('TutellusMerkleDistributorUpdateable')
const HoldersVault = artifacts.require('TutellusDistributionVault')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')

let myDeployer
let myToken
let myRolemanager
let myFarmingVault
let myRewardsVault
let myHoldersVault
let myTreasuryVault
let addresses
let owner, person

describe('Deployer', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
    myDeployer = await Deployer.new(owner)
    addresses = await Promise.all([
      myDeployer.token(),
      myDeployer.rolemanager(),
      myDeployer.farmingVault(),
      myDeployer.rewardsVault(),
      myDeployer.holdersVault(),
      myDeployer.treasuryVault()
    ])
  })
  beforeEach(async () => {
    [myToken, myRolemanager, myFarmingVault, myRewardsVault, myHoldersVault, myTreasuryVault] = await Promise.all([
      Token.at(addresses[0]),
      RoleManager.at(addresses[1]),
      FarmingVault.at(addresses[2]),
      RewardsVault.at(addresses[3]),
      HoldersVault.at(addresses[4]),
      TreasuryVault.at(addresses[5])
    ])
  })

  describe('Deploy completed', () => {
    it('Check token', async () => {
      const [name, symbol, cap, totalSupply, burned] = await Promise.all([
        myToken.name(),
        myToken.symbol(),
        myToken.cap(),
        myToken.totalSupply(),
        myToken.burned()
      ])
      expect(name).to.eq('Tutellus Token')
      expect(symbol).to.eq('TUT')
      expect(cap.toString()).to.eq('200000000000000000000000000')
      expect(totalSupply.toString()).to.eq('184000000000000000000000000')
      expect(burned.toString()).to.eq('0')
    })
    it('Check rolemanager', async () => {
      const defaultadminrole = formatBytes32String(0x0000000000000000000000000000000000000000)
      const response = await myRolemanager.hasRole(defaultadminrole, owner)
      const response2 = await myToken.isMinter(myDeployer.address)
      expect(response).to.eq(true)
      expect(response2).to.eq(true)
    })
  })
  describe('After deploy', () => {
    it('Add staking', async () => {
      const myStaking = await Staking.new(myToken.address, myRolemanager.address, myFarmingVault.address, ether('0.1'), ether('10'), 10)
      const myFarming = await Farming.new(myToken.address, myRolemanager.address, myFarmingVault.address)
      await myFarmingVault.add(myStaking.address, [ether('100')])
      await myFarmingVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Add holder', async () => {
      await myHoldersVault.addHolder(person, ether('10'), 0, 10)
      const response = await myHoldersVault.claim({ from: person })
      expectEvent(response, 'Distribute', {
        account: person,
        amount: ether('1')
      })
    })
  })
})
