const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')

const Deployer = artifacts.require('TutellusDeployer')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')

let myDeployer
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
  [myTreasuryVault] = await Promise.all([
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
      const response2 = await myTreasuryVault.claim()
      expectEvent(response2, 'Claim', {
        sender: owner,
        treasury: owner,
        amount: ether('32888.888888888888888888')
      })
    })
    it('Can claim for third parties', async () => {
      const response2 = await myTreasuryVault.claim({ from: person })
      expectEvent(response2, 'Claim', {
        sender: person,
        treasury: owner,
        amount: ether('32888.888888888888888888')
      })
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
