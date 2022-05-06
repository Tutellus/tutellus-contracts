const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = id('WHITELIST_ADMIN_ROLE');
const ADDRESS = '0x30729B6910757042024304E56BEB015821462691'

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
