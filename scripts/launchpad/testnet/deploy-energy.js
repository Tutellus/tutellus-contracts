const bre = require('hardhat')
const ethers = bre.ethers
const constants = ethers.constants
const ENERGY_AUX_ID = ethers.utils.id('ENERGY_AUX')
const ENERGY_ID = ethers.utils.id('ENERGY')

async function main () {
  bre.run('compile')
  const Manager = await ethers.getContractFactory('TutellusManager')
  const Energy = await ethers.getContractFactory('TutellusEnergy')
  const initializeCalldata = Energy.interface.encodeFunctionData('initialize', [])

  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const response = await myManager.deploy(ENERGY_AUX_ID, Energy.bytecode, initializeCalldata)
  await response.wait()
  const energyAddr = await myManager.get(ENERGY_AUX_ID)
  const response2 = await myManager.setId(ENERGY_AUX_ID, constants.AddressZero)
  const response3 = await myManager.setId(ENERGY_ID, energyAddr)
  await response2.wait()
  await response3.wait()
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
