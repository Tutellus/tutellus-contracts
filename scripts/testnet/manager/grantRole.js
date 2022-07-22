const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = '0x28f5a99355973cc89255b8c4ac88405f27c78ded7608b040ee77a8bdf44d15e2'
const ADDRESS = '0x30729b6910757042024304e56beb015821462691'

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x0e75e4D2041287813a693971634400EAe765910C');
  const response = await myManager.grantRole(ROLE, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
