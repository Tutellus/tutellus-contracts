const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;

const ID = utils.id('ERC20');
const ADDRESS = '0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d';

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');

  const proxyCheck = await myManager.get(ID)
  if(proxyCheck == constants.AddressZero) {
    console.log('Deploying...')
  } else {
    console.log('Upgrading...')
  }
  
  const response = await myManager.setId(ID, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
