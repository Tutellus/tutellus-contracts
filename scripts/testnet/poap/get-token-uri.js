const bre = require('hardhat')
const { utils, constants } = require('ethers')

const TOKEN_ID = '0'

async function main () {
  bre.run('compile')
  const myPOAP = await bre.ethers.getContractAt('TutellusPOAP', '0x741D2E86B07AE985fCA680017D996b59fF6EeC83')
  const uri = await myPOAP.tokenURI(TOKEN_ID)
  console.log('uri', uri)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
