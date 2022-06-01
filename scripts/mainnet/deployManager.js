const bre = require('hardhat');
const ethers = bre.ethers;

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  console.log('Deploying Manager...');
  const myManager = await Manager.deploy();
  await myManager.deployTransaction.wait();
  console.log('Deployed. Initializing...');
  const initTx = await myManager.initialize();
  await initTx.wait();
  console.log('Initialized:', myManager.address);
  console.log('Verify it: hardhat verify --network polygon', myManager.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
