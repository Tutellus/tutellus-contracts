const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = id('MINTER_ROLE');
const ADDRESS = '0x1589C183C84c8D61aBD871F184ddfBfaF0c2983E'

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');
  const response = await myManager.grantRole(ROLE, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
