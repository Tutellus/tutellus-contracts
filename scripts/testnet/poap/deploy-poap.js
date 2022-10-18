const bre = require('hardhat')
const { utils, constants } = require('ethers')
const NFT_ID = utils.id('POAP')

const BASE_URI = 'https://sandbox.2tel.us/api/poap/'

async function main () {
  await bre.run('compile')
  const myManager = await bre.ethers.getContractAt('TutellusManager', '0x0e75e4D2041287813a693971634400EAe765910C')
  const NFT = await bre.ethers.getContractFactory('TutellusPOAP')

  console.log('Deploying POAP implementation...')
  const nftImp = await NFT.deploy()
  await nftImp.deployTransaction.wait()
  console.log('POAP implementation deployed at', nftImp.address)

  const nftAddr1 = await myManager.get(NFT_ID)

  if (nftAddr1 === constants.AddressZero) {
    const initializeCalldata = NFT.interface.encodeFunctionData('initialize', [BASE_URI])
    const response = await myManager.deployProxyWithImplementation(NFT_ID, nftImp.address, initializeCalldata)
    await response.wait()
    const nftAddr2 = await myManager.get(NFT_ID)
    console.log('NFT deployed at', nftAddr2)
  } else {
    console.log('NFT already deployed at', nftAddr1)
    const response = await myManager.upgrade(NFT_ID, nftImp.address, '0x')
    await response.wait()
    console.log('NFT deployed at', nftAddr1)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
