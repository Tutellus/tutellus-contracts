const bre = require('hardhat')
const Deployer = bre.artifacts.require('TutellusDeployer')
const Farming = bre.artifacts.require('TutellusFarming')
const RewardsVault = bre.artifacts.require('TutellusRewardsVault')
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
  const PAIR = '0x5d9AC8993B714df01D079d1B5b0b592e579Ca099'
  const myDeployer = await Deployer.at('0xF33dCE7f829157500a5351475384D54E45C7AFF6')
  const myRewardsVault = await RewardsVault.at('0xc7963fB87C365f67247F97D329D50B9eC5a374B8')
  const [token, rolemanager, rewardsVault] = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.holdersVault(),
    myDeployer.clientsVault(),
    myDeployer.treasuryVault()
  ])
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
