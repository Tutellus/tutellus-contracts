const {
  ether
} = require('@openzeppelin/test-helpers')
const { formatBytes32String } = require('@ethersproject/strings')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
// const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')

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
  [myToken, myRolemanager, myRewardsVault, myHoldersVault] = await Promise.all([
    Token.at(addresses[0]),
    RoleManager.at(addresses[1]),
    RewardsVault.at(addresses[2]),
    HoldersVault.at(addresses[4])
  ])
}

describe('Deployer', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const previous = await latestBlock()
    myDeployer = await Deployer.new(owner, previous)
    const addresses = await getAddresses()
    await setInstances(addresses)
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
      expect(response).to.eq(true)
    })
  })
  describe('After deploy', () => {
    it('Add staking', async () => {
      const myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
      const myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
      await myRewardsVault.add(myStaking.address, [ether('100')])
      await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
    })
    it('Add holder and claim', async () => {
      await myHoldersVault.add(person, ether('10'))
      const response = await myHoldersVault.claim({ from: person }) // 10 / 8 = 1.25 * 4 blocks = 2.5
      expectEvent(response, 'Distribute', {
        account: person,
        amount: ether('3.75')
      })
    })
    it('Claim treasury', async () => {
      const response = await myTreasuryVault.claim() // 1 block => 16444.4 / 2 = 8222.2
      expectEvent(response, 'Claim', {
        amount: ether('32888.888888888888888888')
      })
    })
  })
})
