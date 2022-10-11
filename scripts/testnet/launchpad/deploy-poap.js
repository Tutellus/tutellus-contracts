const bre = require('hardhat')
const { utils } = require('ethers')
const NFT_ID = utils.id('POAP')

async function main () {
  bre.run('compile')
  const myManager = await bre.ethers.getContractAt('TutellusManager', '0x0e75e4D2041287813a693971634400EAe765910C')
  const NFT = await bre.ethers.getContractFactory('TutellusPOAP')
  const nftImp = await NFT.deploy()

  await nftImp.deployTransaction.wait()

  const initializeCalldata = NFT.interface.encodeFunctionData('initialize', [])
  const response = await myManager.deployProxyWithImplementation(NFT_ID, nftImp.address, initializeCalldata)

  await response.wait()

  const nftAddr = await myManager.get(NFT_ID)
  
  console.log('NFT deployed at', nftAddr)
  // console.log('hardhat verify --network goerli', nftAddr, nftImp.address, initializeCalldata)
  // console.log('hardhat verify --network goerli', nftImp.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
