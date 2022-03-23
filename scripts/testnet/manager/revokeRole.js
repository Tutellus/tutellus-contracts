const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = id('WHITELIST_ADMIN_ROLE');
const ADDRESS = '0x44eEdBEE931A5dc22a5f4Ad441679FD5C0e38D38'

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('ReentalManager');
  const myManager = Manager.attach('0x00bce06882d66aDfA61da5B173DE7c8d7Bc3E0e6');
  const response = await myManager.revokeRole(ROLE, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
