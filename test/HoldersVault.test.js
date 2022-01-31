const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')

const Deployer = artifacts.require('TutellusDeployer')
const HoldersVault = artifacts.require('TutellusHoldersVault')

let myDeployer
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
  [myHoldersVault] = await Promise.all([
    HoldersVault.at(addresses[3])
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
      const response = await myHoldersVault.addBatch([owner, person], [ether('15000'), ether('15000')])
      expectEvent(response, 'AddBatch', {
        length: '2'
      })
      const response2 = await myHoldersVault.claim()
      expectEvent(response2, 'Distribute', {
        sender: owner,
        account: owner,
        amount: ether('5625')
      })
    })
    it('Can claim for third parties', async () => {
      const response = await myHoldersVault.addBatch([owner, person], [ether('15000'), ether('15000')])
      expectEvent(response, 'AddBatch', {
        length: '2'
      })
      const response2 = await myHoldersVault.distribute(owner, { from: person })
      expectEvent(response2, 'Distribute', {
        sender: person,
        account: owner,
        amount: ether('5625')
      })
    })
  })
})
