// const {
//   ether,
//   expectEvent
// } = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
// const { latestBlock } = require('@openzeppelin/test-helpers/src/time')

const Deployer = artifacts.require('TutellusDeployer')

let myDeployer

describe('Deployer', function () {
  let owner
  before(async () => {
    [owner] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    [myDeployer] = await Promise.all([
      Deployer.new(owner)
    ])

    const [token, rolemanager, treasury, treasuryVault, farmingVault, rewardsVault, holdersVault] = await Promise.all([
      myDeployer.token(),
      myDeployer.rolemanager(),
      myDeployer.treasury(),
      myDeployer.treasuryVault(),
      myDeployer.farmingVault(),
      myDeployer.rewardsVault(),
      myDeployer.holdersVault()
    ])

    console.log(token, rolemanager, treasury, treasuryVault, farmingVault, rewardsVault, holdersVault)
  })
  // DEPOSIT TESTS
  describe('Deploy completed', () => {
    it('Check', async () => {})
  })
})
