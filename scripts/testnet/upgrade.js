const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;

const ID = utils.id('WHITELIST');
const CONTRACT_NAME = 'TutellusWhitelist';

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x0e75e4D2041287813a693971634400EAe765910C');

  console.log('Deploying new implementation...')
  const Contract = await ethers.getContractFactory(CONTRACT_NAME);
  const contractImp = await Contract.deploy();
  await contractImp.deployTransaction.wait();

  console.log('Upgrading proxy to new implementation...')
  const proxy = await myManager.get(ID);
  const myProxy = await ethers.getContractAt('UUPSUpgradeableByRole', proxy); 
  const response = await myProxy.upgradeTo(contractImp.address);
  await response.wait();

  console.log('hardhat verify --network rinkeby', contractImp.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
