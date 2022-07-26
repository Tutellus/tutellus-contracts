const {
	ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const { ethers } = require('hardhat')
const { expect } = require('chai')
const { artifacts } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { fromEther } = require('../../utils/shared')

const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const RoleManager = artifacts.require('TutellusRoleManager')
const Staking = artifacts.require('TutellusStaking')
const Farming = artifacts.require('TutellusFarming')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')

const STAKETOLEARN_FACTORY = ethers.utils.id("STAKETOLEARN_FACTORY")

const ONE_ETHER = ether('1')
const TWO_ETHER = ether('2')

let myDeployer
let myManager
let myToken
let myRolemanager
let myRewardsVault
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
	[myToken, myRolemanager, myRewardsVault, myHoldersVault] = await Promise.all([
		Token.at(addresses[0]),
		RoleManager.at(addresses[1]),
		RewardsVault.at(addresses[2]),
		HoldersVault.at(addresses[4])
	])
}

describe('StakeToLearn', function () {
	before(async () => {
		[owner, person] = await web3.eth.getAccounts()
	})
	beforeEach(async () => {
		const previous = await latestBlock()
		myDeployer = await Deployer.new(owner, previous)
		const addresses = await getAddresses()
		await setInstances(addresses)
		await myHoldersVault.add(owner, ether('15000'))
		await myHoldersVault.add(person, ether('15000'))

		const Manager = await ethers.getContractFactory('TutellusManager')
		myManager = await Manager.deploy()
		await myManager.initialize()

        const TutellusStakeToLearnFactory = await ethers.getContractFactory('TutellusStakeToLearnFactory')
        const initializeCalldata = TutellusStakeToLearnFactory.interface.encodeFunctionData('initialize', [

		])
        await myManager.deploy(STAKETOLEARN_FACTORY, TutellusStakeToLearnFactory.bytecode, initializeCalldata)
	})
	describe('Deposit', () => {
		let myStaking, myFarming
		beforeEach(async () => {
			myStaking = await Staking.new(myToken.address, myRolemanager.address, myRewardsVault.address, ether('0.1'), ether('10'), 10)
			myFarming = await Farming.new(myToken.address, myRolemanager.address, myRewardsVault.address)
			await myRewardsVault.add(myStaking.address, [ether('100')])
			await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
		})
		it('Deposit claimed tokens from holders Vault', async () => {
			await myHoldersVault.claim({ from: person })
			const balance = await myToken.balanceOf(person)
			await myToken.approve(myStaking.address, balance, { from: person })
			const response = await myStaking.depositFrom(person, balance)
			expectEvent(response, 'Deposit', {
				account: person,
				amount: balance
			})
		})
	})
})
