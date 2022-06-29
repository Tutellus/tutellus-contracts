const { ethers } = require('hardhat')
const bre = require('hardhat')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id('LAUNCHPAD_IDO_FACTORY')

async function main () {
  bre.run('compile')
  const Manager = await bre.ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x0e75e4D2041287813a693971634400EAe765910C')
  const TutellusIDO = await bre.ethers.getContractFactory('TutellusIDO')
  const newImp = await TutellusIDO.deploy()
  await newImp.deployTransaction.wait()

  const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY)
  const idoFactory = await ethers.getContractAt('TutellusIDOFactory', idoFactoryAddr)
  const response = await idoFactory.updateImplementation(newImp.address)
  await response.wait()
  
  console.log('hardhat verify --network rinkeby', newImp.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
