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
  const PAIR = '0x90Ccc8b8ebEba2E39dfca67765fdBF108A6Dab35'
  const myDeployer = await Deployer.at('0x3A2720CAf798366d6C3de028Ad5aBB5c915Cb909')
  const myRewardsVault = await RewardsVault.at('0xc0be60ac345594d57092211FDF3EDaC02d53cD56')
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
