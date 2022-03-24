const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;

const ID = utils.id('LAUNCHPAD_REWARDS');
const CONTRACT_NAME = 'TutellusRewardsVaultV2';

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');

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
