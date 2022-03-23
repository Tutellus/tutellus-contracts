const { assert } = require('chai');
const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;

const ID = utils.id('721');
const CONTRACT_NAME = 'Tutellus721';

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');

  // Check id not locked
  const isLocked = await myManager.locked(ID);
  assert(!isLocked, 'ID is locked');

  console.log('ID not locked, deploying implementation...');

  const Contract = await ethers.getContractFactory(CONTRACT_NAME);
  const contractImp = await Contract.deploy();
  await contractImp.deployTransaction.wait();

  console.log('Deploying proxy and initializing...');

  const initializeCalldata = Contract.interface.encodeFunctionData('initialize', []);
  const response = await myManager.deployProxyWithImplementation(utils.id('AUX'), contractImp.address, initializeCalldata);
  await response.wait();
  
  console.log('Setting ID...');

  const addr = await myManager.get(utils.id('AUX'));
  const response2 = await myManager.setId(ID, addr);
  const response3 = await myManager.setId(utils.id('AUX'), constants.AddressZero);
  await Promise.all([
    response2.wait(),
    response3.wait(),
  ]);

  console.log('hardhat verify --network rinkeby', contractImp.address);
  console.log(addr)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
