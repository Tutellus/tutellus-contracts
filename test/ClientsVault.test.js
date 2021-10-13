const {
    ether, expectRevert, time
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

  const { getBalanceTree } = require('../utils/balanceTree')
  
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

  const sample = require('../examples/example2.json')
  const uri = 'myuri.io'
  const sampleTree = getBalanceTree(sample)
  const account_ = '0x701fd5472DB41225f09e2Ada52Afb9557A7C359A'
  
  const claim = {
    index: sampleTree.toJSON().claims[account_].index,
    account: account_,
    amount: sampleTree.toJSON().claims[account_].amount,
    proof: sampleTree.toJSON().claims[account_].proof
  }
  
  describe('ClientsVault', function () {
    before(async () => {
      [owner, person] = await web3.eth.getAccounts()
    })
    beforeEach(async () => {
      const previous = await latestBlock()
      myDeployer = await Deployer.new(owner, previous)
      const addresses = await getAddresses()
      await setInstances(addresses)
    })
    describe('updateMerkleRoot', () => {
      it('Updating', async () => {
        const response = await myClientsVault.updateMerkleRoot(sampleTree.toJSON().merkleRoot, uri)
        expectEvent(response, 'UpdateMerkleRoot', {
          merkleRoot: sampleTree.toJSON().merkleRoot,
          uri: uri
        })
      })
      it('Cannot update if not admin', async () => {
        await expectRevert(myClientsVault.updateMerkleRoot(sampleTree.toJSON().merkleRoot, uri, { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000')
      })
    })
    describe('updateMerkleRoot', () => {
      it('Claim', async () => {
        await myClientsVault.updateMerkleRoot(sampleTree.toJSON().merkleRoot, uri)
        const response2 = await myClientsVault.claim(claim.index, claim.account, claim.amount, claim.proof)
        expectEvent(response2, 'Claim', {
          account: claim.account,
          amount: ether('15000')
        })
      })
    })
  })