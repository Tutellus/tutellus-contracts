const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
const {
  ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
const { BigNumber } = require('@ethersproject/bignumber')
const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}
async function main () {
  await bre.run('compile')
  scannerSet()
  // const currentBlock = await time.latestBlock()
  // const blocksBehind = BigNumber.from('1296000') // 1 mes
  // const startBlock = currentBlock - blocksBehind
  const treasury = '0x701fd5472DB41225f09e2Ada52Afb9557A7C359A'
  // console.log('! Deploying Tutellus Infrastructure (Deployer)')
  // const myDeployer = await Deployer.new(treasury, startBlock)
  const myDeployer = await Deployer.at('0x99193137EAdA6E896838a997fb02F64C5D421F70')
  const [token, rolemanager, rewardsVault, holdersVault, clientsVault, treasuryVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault()
  ])
  console.log(
    'Deployer:', myDeployer.address,
    '\nToken:', token,
    '\nRoleManager:', rolemanager,
    '\nRewardsVault:', rewardsVault,
    '\nHoldersVault:', holdersVault,
    '\nClientsVault:', clientsVault,
    '\nTreasuryVault:', treasuryVault,
    '\nTreasury:', treasury
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
