const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;
const { id } = utils;

const ADMIN_ROLE = constants.HashZero;
const ROLE = '0x5a422ad2976e7798e7b69a1e99e3c9f846792ccccfe43a967d0b86f044b27e9e'
const ADDRESS = '0x741d2e86b07ae985fca680017d996b59ff6eec83'

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
