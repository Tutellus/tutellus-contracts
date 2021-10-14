const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
const RoleManager = bre.artifacts.require('TutellusRoleManager')
const HoldersVault = bre.artifacts.require('TutellusHoldersVault')
const Staking = bre.artifacts.require('TutellusStaking')
const RewardsVault = bre.artifacts.require('TutellusRewardsVault')
const {
  ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
const { BigNumber } = require('@ethersproject/bignumber')
const holdersJson = require('../../holders.json')
const teamJson = require('../../team.json')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()
  const currentBlock = await time.latestBlock()
  const blocksBehind = BigNumber.from('1296000') // 1 mes
  const STARTBLOCK = currentBlock - blocksBehind
  const TREASURY = '0x5ACB3043da168b59b775eA28F3942597F45e9543'
  const ADMIN = '0x943B71Dd451dAA8097bC2aD6d4afb7517cB4Cf3f'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  console.log('Deploying Tutellus Infrastructure (by TutellusDeployer)...')
  const myDeployer = await Deployer.new(TREASURY, STARTBLOCK)
  console.log('! Tutellus Infrastructure deployed')

  const [token, rolemanager, rewardsVault, holdersVault, clientsVault, treasuryVault, teamVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault(),
    myDeployer.teamVault()
  ])

  console.log(`Granting admin role to ${ADMIN} and ${TREASURY}...`)
  const myRoleManager = await RoleManager.at(rolemanager)
  await myRoleManager.grantAdminRole(ADMIN)
  await myRoleManager.grantAdminRole(TREASURY)
  console.log(`! Admin role granted`)

  const holders = Object.keys(holdersJson)
  const amountsHolders = holders.map(function(x) {
    return holdersJson[x]
  })

  console.log(`Adding ${holders.length} holders...`)
  const myHoldersVault = await HoldersVault.at(holdersVault)
  await myHoldersVault.addBatch(holders, amountsHolders)
  console.log(`! Holders added`)

  const team = Object.keys(teamJson)
  const amountsTeam = team.map(function(x) {
    return teamJson[x]
  })

  console.log(`Adding ${team.length} team holders...`)
  const myTeamVault = await HoldersVault.at(teamVault)
  await myTeamVault.addBatch(team, amountsTeam)
  console.log(`! Team holders added`)

  console.log(`Deploying TutellusStaking...`)
  const myStaking = await Staking.new(token, rolemanager, rewardsVault, ether('0.1'), ether('10'), 1296000)
  console.log(`! TutellusStaking deployed`)

  console.log('Adding TutellusStaking to TutellusRewardsVault...')
  const myRewardsVault = await RewardsVault.at(rewardsVault)
  await myRewardsVault.add(myStaking.address, [ether('100')])
  console.log(`! TutellusStaking added to TutellusRewardsVault`)

  console.log(
    'Deployer:', myDeployer.address,
    '\nToken:', token,
    '\nRoleManager:', rolemanager,
    '\nRewardsVault:', rewardsVault,
    '\nHoldersVault:', holdersVault,
    '\nClientsVault:', clientsVault,
    '\nTreasuryVault:', treasuryVault,
    '\nTeamVault:', teamVault,
    '\nStaking:', myStaking.address,
    '\nTreasury:', TREASURY
  )
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
