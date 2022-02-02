// const holdersJson = require('../holders.json')
const teamJson = require('../team.json')
const bre = require('hardhat')

const checkJsonAddressesChecksum = (json) => {
  const addresses = Object.keys(json)
  const response = addresses.map(function (x) {
    return bre.web3.utils.checkAddressChecksum(x)
  })
  const returning = response.reduce(function (a, b) {
    return a * b
  })
  return returning
}

async function main () {
  checkJsonAddressesChecksum(teamJson)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
