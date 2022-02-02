const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')
const { fromEther } = require('../utils/shared')

const Deployer = artifacts.require('TutellusDeployer')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')
const Token = artifacts.require('TutellusERC20')

let myDeployer
let myTreasuryVault
let myToken
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
  [myToken, myTreasuryVault] = await Promise.all([
    Token.at(addresses[0]),
    TreasuryVault.at(addresses[5])
  ])
}

describe('TreasuryVault', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const previous = await latestBlock()
    myDeployer = await Deployer.new(owner, previous)
    const addresses = await getAddresses()
    await setInstances(addresses)
  })
  describe('Claim', () => {
    it('Can claim correct', async () => {
      await myTreasuryVault.claim()
      const balance = await myToken.balanceOf(owner)
      expect(fromEther(balance)).gt(0)
    })
    it('Can claim for third parties', async () => {
      await myTreasuryVault.claim({ from: person })
      const balance = await myToken.balanceOf(owner)
      expect(fromEther(balance)).gt(0)
    })
  })
  describe('Update treasury', () => {
    it('Can update treasury', async () => {
      const response = await myTreasuryVault.updateTreasury(person)
      expectEvent(response, 'UpdateTreasury', {
        previous: owner,
        next: person
      })
    })
    it('Cannot update if not admin', async () => {
      await expectRevert(myTreasuryVault.updateTreasury(person, { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
    })
  })
})
