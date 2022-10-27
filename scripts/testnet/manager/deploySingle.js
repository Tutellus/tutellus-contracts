const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants, Wallet, provider } = ethers;
const { createTx, sendTx } = require('../../../utils/gnosis');

const ID = utils.id('POAP');
const CONTRACT_NAME = 'TutellusPOAP';

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

const INITIALIZE = {
  sig: 'initialize(string)',
  args: ['https://sandbox.2tel.us/api/poap/'],
}

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x0e75e4D2041287813a693971634400EAe765910C');

  const wallet = new Wallet(process.env.PRIVATE_KEY);

  const proxyCheck = await myManager.get(ID)

  console.log('proxyCheck', proxyCheck)
  // const Contract = await ethers.getContractFactory(CONTRACT_NAME);
  
  // let initializeCalldata;

  // if(proxyCheck == constants.AddressZero) {
  //   console.log('Deploying...')
  //   initializeCalldata = Contract.interface.encodeFunctionData(INITIALIZE.sig, INITIALIZE.args);
  // } else {
  //   console.log('Upgrading...')
  //   initializeCalldata = '0x';
  // }

  // console.log('Deploying...')
  // const deploying = await myManager.deploy(ID, Contract.bytecode, initializeCalldata);
  // await deploying.wait();
  // console.log('Deployed', deploying.hash)

  // const data = {
  //   to: myManager.address,
  //   data: myManager.interface.encodeFunctionData('deploy', [
  //     ID,
  //     Contract.bytecode,
  //     initializeCalldata,
  //   ]),
  //   value: 0,
  //   operation: 0,
  // };

  // const chainId = provider._network.chainId;
  // const txData = await createTx(provider, chainId, SAFE, data, wallet);
  // await sendTx(chainId, SAFE, txData);
  // console.log('SafeTxHash:', txData.contractTransactionHash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
