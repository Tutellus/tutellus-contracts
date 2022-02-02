const bre = require('hardhat')
// const RewardsVault = bre.artifacts.require('TutellusRewardsVault')
// const ClientsVault = bre.artifacts.require('TutellusClientsVault')
// const HoldersVault = bre.artifacts.require('TutellusHoldersVault')
// const TreasuryVault = bre.artifacts.require('TutellusTreasuryVault')
// const RoleManager = bre.artifacts.require('TutellusRoleManager')
// const Token = bre.artifacts.require('TutellusERC20')
const Staking = bre.artifacts.require('TutellusStaking')

// const {
//   ether, expectRevert, time
// } = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
// const { BigNumber } = require('@ethersproject/bignumber')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()
  const mockAddress = '0x0000000000000000000000000000000000000000'
  // const startBlock = 0
  // const endBlock = 1
  console.log('! Deploying Tutellus Infrastructure Mocks')
  // const myToken = await Token.new('TutellusMock', 'TUTM', 1, mockAddress)
  // const myRewardsVault = await RewardsVault.new(mockAddress, mockAddress, 0, startBlock, endBlock)
  // const myClientsVault = await ClientsVault.new(mockAddress, mockAddress)
  // const myHoldersVault = await HoldersVault.new(mockAddress, mockAddress, 0, startBlock, endBlock)
  // const myTreasuryVault = await TreasuryVault.new(mockAddress, mockAddress, mockAddress, 0, startBlock, endBlock)
  // const myRolemanager = await RoleManager.new()
  const myStaking = await Staking.new(mockAddress, mockAddress, mockAddress, '0', '1', '0')
  console.log(myStaking.address)

  // console.log(
  //   'Token:', myToken.address,
  //   '\nRoleManager:', myRolemanager.address,
  //   '\nRewardsVault:', myRewardsVault.address,
  //   '\nHoldersVault:', myHoldersVault.address,
  //   '\nClientsVault:', myClientsVault.address,
  //   '\nTreasuryVault:', myTreasuryVault.address
  // )
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
