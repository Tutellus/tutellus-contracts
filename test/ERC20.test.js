const {
  ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
// const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
// const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')

const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('TutellusRoleManager')

let myToken, myRoleManager
let owner, person

describe('TutellusERC20', function () {
  before(async () => {
    [owner, person] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    myRoleManager = await RoleManager.new()
    myToken = await Token.new('Tutellus Token', 'TUT', ether('200000000'), myRoleManager.address)
    await myRoleManager.grantMinterRole(owner)
  })

  describe('Mint', () => {
    it('Cant mint if not minter', async () => {
      await expectRevert(myToken.mint(person, ether('100'), { from: person }), 'AccessControlProxyPausable: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6')
    })
    it('Can mint if minter', async () => {
      const response = await myToken.mint(person, ether('100'))
      expectEvent(response, 'Mint', {
        account: person,
        amount: ether('100')
      })
    })
  })
  describe('Burn', () => {
    it('Cant burn more than totalSupply', async () => {
      await myToken.mint(person, ether('100'))
      await expectRevert(myToken.burn(ether('101'), { from: person }), 'ERC20: burn amount exceeds balance')
    })
    it('Cant burn not owned tokens', async () => {
      await myToken.mint(person, ether('100'))
      await expectRevert(myToken.burn(ether('100')), 'ERC20: burn amount exceeds balance')
    })
  })
  describe('TotalSupply', () => {
    it('Cant burn more than totalSupply', async () => {
      const cap = await myToken.cap()
      const response0 = await myToken.mint(owner, cap)
      expectEvent(response0, 'Mint', {
        account: owner,
        amount: cap
      })
      const response1 = await myToken.burn(cap)
      expectEvent(response1, 'Burn', {
        account: owner,
        amount: cap
      })
      await expectRevert(myToken.mint(owner, ether('1')), 'TutellusERC20: mint amount exceeds cap')
    })
  })
})
