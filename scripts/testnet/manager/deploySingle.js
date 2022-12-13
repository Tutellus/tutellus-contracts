const { ethers } = require('hardhat');
const { utils, constants } = ethers;

const ID = utils.id('CLIENTS_VAULT');
const CONTRACT_NAME = 'TutellusClientsVaultV2';

const INITIALIZE = {
  sig: 'initialize(string)',
  args: ['https://sandbox.2tel.us/api/poap/'],
}

async function main () {
  const myManager = await ethers.getContractAt('TutellusManager', '0x0e75e4D2041287813a693971634400EAe765910C');
  const proxyCheck = await myManager.get(ID);
  const Contract = await ethers.getContractFactory(CONTRACT_NAME);
  
  const provider = ethers.provider;

  console.log('Provider', provider)

  let initializeCalldata;

  if(proxyCheck == constants.AddressZero) {
    console.log('Deploying...')
    initializeCalldata = Contract.interface.encodeFunctionData(INITIALIZE.sig, INITIALIZE.args);
  } else {
    console.log('Upgrading...')
    initializeCalldata = '0x';
  }

  // const deploying = await myManager.deploy(ID, Contract.bytecode, initializeCalldata);
  // await deploying.wait();

  // const proxy = await myManager.get(ID);
  // console.log('Proxy deployed at', proxy);

  // const implementation = await myManager.implementationByProxy(proxy);
  // console.log('Implementation deployed at', implementation.address);
  // console.log('hardhat verify --network goerli', implementation.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
