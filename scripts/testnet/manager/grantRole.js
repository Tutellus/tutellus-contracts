const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = id('CROWDSALE_ADMIN_ROLE');
const ADDRESS = '0x1eeeDE19FaE1369A8fc3e3F178e42EB8810ba2cf'

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('ReentalManager');
  const myManager = Manager.attach('0x00bce06882d66aDfA61da5B173DE7c8d7Bc3E0e6');
  const response = await myManager.grantRole(ROLE, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
