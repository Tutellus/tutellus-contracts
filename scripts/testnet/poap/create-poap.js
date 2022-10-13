const bre = require('hardhat')
const { utils, constants } = require('ethers')

const BASE_URI = 'https://af08-88-18-39-227.eu.ngrok.io/api/poap/'
const POAP_ID = '1a94e97b-dfe1-44de-9c9c-3c2623895b00'
const PERPETUAL = true
const IDO = PERPETUAL ? constants.HashZero : constants.HashZero
const ENERGY = 3456.28

async function main () {
  bre.run('compile')
  const myPOAP = await bre.ethers.getContractAt('TutellusPOAP', '0x741D2E86B07AE985fCA680017D996b59fF6EeC83')

  const setUri = await myPOAP.setBaseURI(BASE_URI)
  await setUri.wait()

  const tx = await myPOAP.createPOAP(
    utils.id(POAP_ID),
    IDO,
    PERPETUAL,
    utils.parseEther(ENERGY.toString())
  );
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
