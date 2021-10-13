const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
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
const holdersJson = require('../../examples/holders.json')
const teamJson = require('../../examples/team.json')

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
  const TREASURY = '0xA45eE5aE23eb0F0f2a3CB8A70fd9C5727715dA60'

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  console.log('! Deploying Tutellus Infrastructure (Deployer)')
  const myDeployer = await Deployer.new(TREASURY, STARTBLOCK)
  const [token, rolemanager, rewardsVault, holdersVault, clientsVault, treasuryVault, teamVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault(),
    myDeployer.teamVault()
  ])

  console.log('! Adding holders')
  const holders = Object.keys(holdersJson)
  const amountsHolders = holders.map(function(x) {
    return holdersJson[x]
  })
  const myHoldersVault = await HoldersVault.at(holdersVault)
  await myHoldersVault.addBatch(holders, amountsHolders)

  console.log('! Adding team')
  const team = Object.keys(teamJson)
  const amountsTeam = team.map(function(x) {
    return teamJson[x]
  })
  const myTeamVault = await HoldersVault.at(teamVault)
  await myTeamVault.addBatch(team, amountsTeam)

  console.log('! Deploying Staking')
  const myStaking = await Staking.new(token, rolemanager, rewardsVault, ether('0.1'), ether('10'), 1296000)

  console.log('! Adding Staking to RewardsVault')
  const myRewardsVault = await RewardsVault.at(rewardsVault)
  await myRewardsVault.add(myStaking.address, [ether('100')])

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
