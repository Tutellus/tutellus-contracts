const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;

const REWARDS_VAULT = utils.id('LAUNCHPAD_REWARDS');
const REWARDS_MANAGER_ROLE = utils.id('REWARDS_MANAGER_ROLE');

async function main () {
  bre.run('compile');
  const signers = await ethers.getSigners();
  const owner = signers[0].address;

  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');
  const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2');

  console.log('Deploying RewardsVaultV2...');
  const rvImp = await RewardsVaultV2.deploy();
  await rvImp.deployTransaction.wait();

  console.log('Deploying proxy and initializing...');
  const initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', []);
  const response = await myManager.deployProxyWithImplementation(REWARDS_VAULT, rvImp.address, initializeCalldata);
  await response.wait();
  console.log('RewardsVaultV2 initialized.');
  const rewardsVault = await myManager.get(REWARDS_VAULT);

  console.log('Granting rewards manager role to', owner);
  const tx = await myManager.grantRole(REWARDS_MANAGER_ROLE, owner);
  await tx.wait();
  console.log('Role granted to', owner);

  console.log('RewardsVaultV2:', rewardsVault);
  console.log('hardhat verify --network rinkeby', rvImp.address); 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
