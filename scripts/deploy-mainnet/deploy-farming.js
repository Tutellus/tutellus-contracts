const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
const Farming = bre.artifacts.require('TutellusFarming')
const RewardsVault = bre.artifacts.require('TutellusRewardsVault')
const {
  ether
} = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const config = require('../../hardhat.config')
// const { BigNumber } = require('@ethersproject/bignumber')

const scannerSet = () => {
  const chainId = config.default.networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main() {
  await bre.run('compile')
  scannerSet()
  const PAIR = '0xc3E197b66616CB2D90Fb339978FeFb9C4B424867'
  const myDeployer = await Deployer.at('0xCd56729889092b259B9b87B7cE15528F6CbDB078')
  const myRewardsVault = await RewardsVault.at('0x65fc353280E25c960Af62Ee0752b29c48F9A9C9f')
  const [token, rolemanager, rewardsVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault()
  ])
  console.log('Token:', token)
  console.log('! Deploying Farming. Args: ', PAIR, rolemanager, rewardsVault)
  const myFarming = await Farming.new(PAIR, rolemanager, rewardsVault)
  console.log('! Farming deployed at: ', myFarming.address)
  console.log('! Adding Farming to RewardsVault ', myFarming.address)
  await myRewardsVault.add(myFarming.address, [ether('20'), ether('80')])
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
