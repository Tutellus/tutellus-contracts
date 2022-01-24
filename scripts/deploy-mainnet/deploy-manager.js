const bre = require('hardhat')
const Manager = bre.artifacts.require('TutellusManager')
const ids = require('../../examples/testnet/ids.json')

async function main () {
    console.log(ids)
    // const myManager = await Manager.new()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
