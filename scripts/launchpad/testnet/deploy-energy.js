const { ethers } = require('hardhat')
const ENERGY_ID = ethers.utils.id('ENERGY')

async function main () {
  bre.run('compile')
  const Manager = await ethers.getContractFactory('TutellusManager')
  const Energy = await ethers.getContractFactory('TutellusEnergy')
  const initializeCalldata = Energy.interface.encodeFunctionData('initialize', [])

  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const response = await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldata)
  await response.wait()
  const energyAddr = await myManager.get(ENERGY_ID)
  const myEnergy = Energy.attach(energyAddr)
  const energyImp = await myEnergy.implementation()

  console.log('hardhat verify --network rinkeby', energyAddr, energyImp, initializeCalldata)
  console.log('hardhat verify --network rinkeby', energyImp)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
