const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;
const { id } = utils;

const ROLE = id('ADMIN_POAP_ROLE');
const ADDRESS = '0x30729B6910757042024304E56BEB015821462691'

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x0e75e4D2041287813a693971634400EAe765910C');

  console.log('Granting role', ROLE, 'to', ADDRESS)
  const response = await myManager.grantRole(ROLE, ADDRESS)
  await response.wait()
  console.log('Role granted')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
