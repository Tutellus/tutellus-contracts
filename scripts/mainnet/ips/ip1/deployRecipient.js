const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, constants, Wallet, provider } = ethers;
const { createTx, sendTx } = require('../../../../utils/gnosis');

const ID = utils.id('TUT_IP1_RECIPIENT');
const CONTRACT_NAME = 'TutellusRecipient';

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');

  const wallet = new Wallet(process.env.PRIVATE_KEY);

  const proxyCheck = await myManager.get(ID)

  const Contract = await ethers.getContractFactory(CONTRACT_NAME);
  
  let initializeCalldata;

  if(proxyCheck == constants.AddressZero) {
    console.log('Deploying...')
    initializeCalldata = Contract.interface.encodeFunctionData('initialize', []);
  } else {
    console.log('Upgrading...')
    initializeCalldata = '0x';
  }

  const data = {
    to: myManager.address,
    data: myManager.interface.encodeFunctionData('deploy', [
      ID,
      Contract.bytecode,
      initializeCalldata,
    ]),
    value: 0,
    operation: 0,
  };

  const chainId = provider._network.chainId;
  const txData = await createTx(provider, chainId, SAFE, data, wallet);
  await sendTx(chainId, SAFE, txData);
  console.log('SafeTxHash:', txData.contractTransactionHash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
