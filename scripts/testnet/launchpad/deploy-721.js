const bre = require('hardhat')
const { utils } = require('ethers')
const NFT_ID = utils.id('721')

async function main () {
  bre.run('compile')
  const Manager = await bre.ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const NFT = await bre.ethers.getContractFactory('Tutellus721')
  const nftImp = await NFT.deploy()

  await nftImp.deployTransaction.wait()

  const initializeCalldata = NFT.interface.encodeFunctionData('initialize', [])
  const response = await myManager.deployProxyWithImplementation(NFT_ID, nftImp.address, initializeCalldata)

  await response.wait()

  const nftAddr = await myManager.get(NFT_ID)
  
  console.log('hardhat verify --network rinkeby', nftAddr, nftImp.address, initializeCalldata)
  console.log('hardhat verify --network rinkeby', nftImp.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
