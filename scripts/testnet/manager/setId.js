const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;

const ID = utils.id('REENTAL_VAULT');
const ADDRESS = '0x1eeeDE19FaE1369A8fc3e3F178e42EB8810ba2cf';

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('ReentalManager');
  const myManager = Manager.attach('0x00bce06882d66aDfA61da5B173DE7c8d7Bc3E0e6');

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
