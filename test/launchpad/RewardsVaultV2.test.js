const {
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { parseEther, id } = require('ethers/lib/utils')
const { constants } = require('ethers')

const REWARDS_VAULT = id('LAUNCHPAD_REWARDS')
const MINTER_ROLE = id('MINTER_ROLE')
const REWARDS_MANAGER_ROLE = id('REWARDS_MANAGER_ROLE')

let myDeployer
let myToken
let myRewardsVault
let myManager
let owner, person, person2

const getAddresses = async () => {
  const addresses = await Promise.all([
    myDeployer.token()
  ])
  return addresses
}

const setInstances = async (addresses) => {
  const Token = await ethers.getContractFactory('TutellusERC20')
  myToken = Token.attach(addresses[0])
}

describe('RewardsVaultV2', function () {
  before(async () => {
    [owner, person, person2] = await web3.eth.getAccounts()
  })
  beforeEach(async () => {
    const Deployer = await ethers.getContractFactory('TutellusDeployer')
    myDeployer = await Deployer.deploy(owner, 0)
    const addresses = await getAddresses()
    await setInstances(addresses)

    const ids = {   
        ERC20: myToken.address,
    }
    const Manager = await ethers.getContractFactory('TutellusManager')
    myManager = await Manager.deploy()
    await myManager.initialize()

    const keys = Object.keys(ids)

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const addr = ids[key]
        const myContract = await ethers.getContractAt('AccessControlProxyPausable', addr)

        await myManager.setId(ethers.utils.id(key), addr)
        await myContract.updateManager(myManager.address)
    }
    await myManager.grantRole(MINTER_ROLE, owner)
    await myManager.grantRole(REWARDS_MANAGER_ROLE, owner)
})

  describe('Deploy', () => {
      it('Deploying RVV2', async () => {
          const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
          let initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', []);

          await myManager.deploy(REWARDS_VAULT, RewardsVaultV2.bytecode, initializeCalldata)

          const rewardsVault = await myManager.get(REWARDS_VAULT)
          expect(rewardsVault).not.eq(ethers.constants.AddressZero)
      })
  })
  describe('Setup', () => {
    beforeEach(async () => {
      const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
      let initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', []);

      await myManager.deploy(REWARDS_VAULT, RewardsVaultV2.bytecode, initializeCalldata)

      const rewardsVault = await myManager.get(REWARDS_VAULT)
      expect(rewardsVault).not.eq(ethers.constants.AddressZero)

      myRewardsVault = RewardsVaultV2.attach(rewardsVault)

      await myToken.mint(rewardsVault, parseEther('1000000'))
      await myRewardsVault.setRewardPerBlock(parseEther('1'))
    })
    it('Adding accounts correctly', async () => {
      await myRewardsVault.add(owner, [parseEther('100')])
      await myRewardsVault.add(person, [parseEther('20'), parseEther('80')])
    })
    it('Error: allocation over 100', async () => {
      await myRewardsVault.add(owner, [parseEther('100')])
      await expectRevert(myRewardsVault.add(person, [parseEther('20'), parseEther('85')]), 'TutellusRewardsVaultV2: total allocation must be 100 ether')
    })
    it('Error: allocation under 100', async () => {
      await expectRevert(myRewardsVault.add(person, [parseEther('20')]), 'TutellusRewardsVaultV2: total allocation must be 100 ether')
    })
    it('Error: different number of accounts and allocations', async () => {
      await expectRevert(myRewardsVault.add(person, [parseEther('20'), parseEther('100')]), 'TutellusRewardsVaultV2: allocation array must have same length as number of accounts')
    })
  })
  describe('Release', () => {
    beforeEach(async () => {
      const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
      let initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', []);

      await myManager.deploy(REWARDS_VAULT, RewardsVaultV2.bytecode, initializeCalldata)

      const rewardsVault = await myManager.get(REWARDS_VAULT)
      expect(rewardsVault).not.eq(ethers.constants.AddressZero)

      myRewardsVault = RewardsVaultV2.attach(rewardsVault)

      await myToken.mint(rewardsVault, parseEther('1000000'))
      await myRewardsVault.add(owner, [parseEther('100')])
      await myRewardsVault.add(person, [parseEther('20'), parseEther('80')])
    })
    it('Can read correct released', async () => {
      await myRewardsVault.setRewardPerBlock(parseEther('1'))
      const totalAllocation = parseEther('100')
      const [ownerAllocation, personAllocation, rpb] = await Promise.all([
        myRewardsVault.allocation(owner),
        myRewardsVault.allocation(person),
        myRewardsVault.rewardPerBlock(),
      ])
      await time.advanceBlock()

      const [ownerReleased, personReleased] = await Promise.all([
        myRewardsVault.released(owner),
        myRewardsVault.released(person),
      ])
      
      const expOwnerReleased = rpb.mul(ownerAllocation).div(totalAllocation)
      const expPersonReleased = rpb.mul(personAllocation).div(totalAllocation)
      expect(expOwnerReleased.eq(ownerReleased)).eq(true)
      expect(expPersonReleased.eq(personReleased)).eq(true)
    })
  })
  describe('Distribute tokens', () => {
    beforeEach(async () => {
      const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
      let initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', []);

      await myManager.deploy(REWARDS_VAULT, RewardsVaultV2.bytecode, initializeCalldata)

      const rewardsVault = await myManager.get(REWARDS_VAULT)
      expect(rewardsVault).not.eq(ethers.constants.AddressZero)

      myRewardsVault = RewardsVaultV2.attach(rewardsVault)

      await myToken.mint(rewardsVault, parseEther('1000000'))
      await myRewardsVault.add(owner, [parseEther('100')])
      await myRewardsVault.add(person, [parseEther('20'), parseEther('80')])
    })
    it('Can distribute tokens correctly (checking available)', async () => {
      await myRewardsVault.setAllocations([parseEther('100'), parseEther('0')])
      await myRewardsVault.setRewardPerBlock(parseEther('1')) // 1 to owner
      await myRewardsVault.setAllocations([parseEther('50'), parseEther('50')]) // 1.5 to owner, 0.5 to person
      await myRewardsVault.setRewardPerBlock(parseEther('2')) // 2.5 to owner, 1.5 to person
      await myRewardsVault.setRewardPerBlock(parseEther('0')) // finish

      const [availableOwner, availablePerson] = await Promise.all([
        myRewardsVault.available(owner),
        myRewardsVault.available(person),
      ])
      expect(availableOwner.eq(parseEther('2.5'))).eq(true)
      expect(availablePerson.eq(parseEther('1.5'))).eq(true)

      await myRewardsVault.distribute(person2, availableOwner)

      const balance = await myToken.balanceOf(person2)
      const availableAfter = await myRewardsVault.available(owner)

      expect(availableOwner.eq(balance)).eq(true)
      expect(availableAfter.eq(constants.Zero)).eq(true)

    })
    it('Cant distribute more than available', async () => {
      await expectRevert(
        myRewardsVault.distribute(person2, constants.MaxUint256),
        'TutellusRewardsVaultV2: amount exceeds available'
      )
    })
  })
})
