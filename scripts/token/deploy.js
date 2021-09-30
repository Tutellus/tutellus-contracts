const bre = require('hardhat')
const Token = bre.artifacts.require('Token')
const { ether } = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}
async function main () {
  await bre.run('compile')
  scannerSet()

  console.log('! Deploying Token')
  const myToken = await Token.new('Tutellus Token', 'TUT', ether('200000000'))
  console.log('Token deployed at: ', myToken.address)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
