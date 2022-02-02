const bre = require('hardhat')
const HoldersVault = bre.artifacts.require('TutellusHoldersVault')
// const {
//   ether, expectRevert, time
// } = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
const json = require('../../examples/random.json')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()

  const holders = Object.keys(json)
  const amounts = holders.map(function (x) {
    return json[x]
  })
  const myHoldersVault = await HoldersVault.at('0x3a9Ed1A6e4Bb78D753fBDbDDdA335486Cbe94e9A')
  await myHoldersVault.addBatch(holders, amounts)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
