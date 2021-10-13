const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
const Staking = bre.artifacts.require('TutellusStaking')
const Farming = bre.artifacts.require('TutellusFarming')
const {
  ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../scanners.json')
const { networks } = require('../hardhat.config')
const { BigNumber } = require('@ethersproject/bignumber')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()
  
  const myDeployer = await Deployer.at('0x99193137EAdA6E896838a997fb02F64C5D421F70')
  const [token, rolemanager, rewardsVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault()
  ])
  console.log('! Deploying Staking. Args: ', token, rolemanager, rewardsVault, ether('0.1').toString(), ether('10').toString(), 1296000)
  // const myStaking = await Staking.new(token, rolemanager, rewardsVault, ether('0.1'), ether('10'), 1296000)
  // console.log('! Deploying Farming. Args: ', token, rolemanager, rewardsVault)
  // const myFarming = await Farming.new(token, rolemanager, rewardsVault)
  // console.log('! Staking deployed at: ', myStaking.address)
  // console.log('! Farming deployed at: ', myFarming.address)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
