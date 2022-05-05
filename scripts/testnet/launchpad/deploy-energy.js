const bre = require('hardhat')
const { utils } = require('ethers')
const ENERGY_ID = utils.id('ENERGY')

async function main () {
  bre.run('compile')
  const Manager = await bre.ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const Energy = await bre.ethers.getContractFactory('TutellusEnergy')
  const energyImp = await Energy.deploy()

  await energyImp.deployTransaction.wait()

  const initializeCalldata = Energy.interface.encodeFunctionData('initialize', [])
  const response = await myManager.deployProxyWithImplementation(ENERGY_ID, energyImp.address, initializeCalldata)

  await response.wait()

  const energyAddr = await myManager.get(ENERGY_ID)
  
  console.log('hardhat verify --network rinkeby', energyAddr, energyImp.address, initializeCalldata)
  console.log('hardhat verify --network rinkeby', energyImp.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
