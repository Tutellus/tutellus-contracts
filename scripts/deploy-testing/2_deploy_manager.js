const { ethers } = require('hardhat')
const bre = require('hardhat')
const Manager = bre.artifacts.require('TutellusManager')
const ACPP = bre.artifacts.require('AccessControlProxyPausable')
const ids = require('../../examples/testnet/ids_goerli.json')

async function main () {
  bre.run('compile')
  const myManager = await Manager.new()
  await myManager.initialize()
  console.log('Manager: ', myManager.address)

  const keys = Object.keys(ids)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const addr = ids[key]
    const myContract = await ACPP.at(addr)

    console.log(`Setting id of ${key}`)
    await myManager.setId(ethers.utils.id(key), addr)

    console.log(`Modifying rolemanager of ${key}(${myContract.address}) to ${myManager.address}...`)
    await myContract.updateManager(myManager.address)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
