const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants } = ethers;

const ID = utils.id('WHITELIST');
const CONTRACT_NAME = 'TutellusWhitelist';

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');

  const proxyCheck = await myManager.get(ID)
  if(proxyCheck == constants.AddressZero) {
    console.log('Deploying...')
    const Contract = await ethers.getContractFactory(CONTRACT_NAME);
    const initializeCalldata = Contract.interface.encodeFunctionData('initialize', []);
    const response = await myManager.deploy(ID, Contract.bytecode, initializeCalldata)
    await response.wait()
  } else {
    console.log('Upgrading...')
    const Contract = await ethers.getContractFactory(CONTRACT_NAME);
    const initializeCalldata = Contract.interface.encodeFunctionData('initialize', []);
    const response = await myManager.deploy(ID, Contract.bytecode, initializeCalldata)
    await response.wait()
  }
  


  // const proxy = await myManager.get(ID)
  // const implementation = await ERC1967Proxy.attach(proxy).implementation(proxy)
  // console.log('hardhat verify --network rinkeby', implementation);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
