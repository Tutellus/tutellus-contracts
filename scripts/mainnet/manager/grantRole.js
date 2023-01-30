const bre = require('hardhat');
const { provider, Wallet, utils } = bre.ethers;
const { sendTx, createTx } = require('../../../utils/gnosis');
const ethers = bre.ethers;

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

const ROLE = utils.id('ADMIN_POAP_ROLE');
const ADDRESS = '0xB601DfB148Ed4D2Ee5b5844Dd02b977920089849'

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');

  const wallet = new Wallet(process.env.PRIVATE_KEY);

  const check = await myManager.hasRole(ROLE, ADDRESS);

  if(check) {
    console.log('Already has role')
    return;
  }

  const data = {
    to: myManager.address,
    data: myManager.interface.encodeFunctionData('grantRole', [
      ROLE,
      ADDRESS,
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
