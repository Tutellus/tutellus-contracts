// const {
//   ether,
//   expectEvent
// } = require('@openzeppelin/test-helpers')
const { formatBytes32String } = require('@ethersproject/strings')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
// const { latestBlock } = require('@openzeppelin/test-helpers/src/time')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('IAccessControlUpgradeable')

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
  })
  // DEPOSIT TESTS
  describe('Deploy completed', () => {
    it('Check token', async () => {
      const tokenAddress = await myDeployer.token()
      const myToken = await Token.at(tokenAddress)
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
      const rolemanagerAddress = await myDeployer.rolemanager()
      const tokenAddress = await myDeployer.token()
      const holdersVaultAddress = await myDeployer.holdersVault()
      const myToken = await Token.at(tokenAddress)
      const myRolemanager = await RoleManager.at(rolemanagerAddress)
      const defaultadminrole = formatBytes32String(0x0000000000000000000000000000000000000000)
      const response = await myRolemanager.hasRole(defaultadminrole, owner)
      const response2 = await myToken.isMinter(holdersVaultAddress)
      expect(response).to.eq(true)
      expect(response2).to.eq(true)
    })
  })
})
