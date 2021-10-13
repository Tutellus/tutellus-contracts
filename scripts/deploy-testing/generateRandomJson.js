const bre = require('hardhat')
const fs = require('fs')

async function main () {
    const json = {};
    for(let i=0; i<200; i++) {
        const account = bre.web3.eth.accounts.create()
        json[account.address] = '0'
    }
    fs.writeFileSync('./examples/random.json', JSON.stringify(json, null, 4))
    console.log(json)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
