const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')
const { fromEther } = require('../../utils/shared')

const Deployer = artifacts.require('TutellusDeployer')
const HoldersVault = artifacts.require('TutellusHoldersVault')
const Token = artifacts.require('TutellusERC20')

let myDeployer
let myHoldersVault, myToken
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
  [myToken, myHoldersVault] = await Promise.all([
    Token.at(addresses[0]),
    HoldersVault.at(addresses[4])
  ])
}

describe('HoldersVault', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const previous = await latestBlock()
    myDeployer = await Deployer.new(owner, previous)
    const addresses = await getAddresses()
    await setInstances(addresses)
  })
  describe('Adding', () => {
    it('Add batch correct', async () => {
      const response = await myHoldersVault.addBatch([owner, person], [ether('15000'), ether('15000')])
      expectEvent(response, 'AddBatch', {
        length: '2'
      })
    })
    it('Cannot add more amount than limit', async () => {
      await expectRevert(myHoldersVault.addBatch([owner, person], [ether('10000000000'), ether('15000')]), 'TutellusHoldersVault: minted exceeds limit')
    })
  })
  describe('Claim', () => {
    it('Can claim correct', async () => {
      await myHoldersVault.addBatch([owner, person], [ether('15000'), ether('15000')])
      await myHoldersVault.claim()
      const balance = await myToken.balanceOf(owner)
      expect(fromEther(balance)).gt(0)
    })
    it('Can claim for third parties', async () => {
      await myHoldersVault.addBatch([owner, person], [ether('15000'), ether('15000')])
      await myHoldersVault.distribute(owner, { from: person })
      const balance = await myToken.balanceOf(owner)
      expect(fromEther(balance)).gt(0)
    })
  })
})
