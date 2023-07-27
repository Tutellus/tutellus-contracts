// gnosis.infra.js
const axios = require('axios');
const { utils, constants, Contract } = require('ethers');
const GNOSIS_SAFE = require('./abi/GnosisSafe.json');

// ///////////////////////////////////////////////////////////////
// PRIVATE METHODS
// ///////////////////////////////////////////////////////////////

const query = async (method, url, data) => {
  try {
    return await axios({
      url,
      method,
      data,
    });
  } catch (error) {
    console.error('ERROR - QUERY:', error);
    if (error.response.data) {
      throw new Error(JSON.stringify(error.response.data));
    }
    return undefined;
  }
};

const getNetworkKey = (chainId) => {
  switch (chainId) {
    case 1:
      return '';
    case 4:
      return 'rinkeby.';
    case 5:
      return 'goerli.';
    case 137:
      return 'polygon.';
    case 56:
      return 'bsc.';
    case 100:
      return 'xdai.';
    case 73799:
      return 'volta.';
    default:
      return undefined;
  }
};

const getUrl = (chainId) => `https://safe-transaction-${getNetworkKey(chainId)}safe.global/api/v1`;

// const getSafeData = async (chainId, safe) => {
//   const baseUrl = getUrl(chainId);
//   const url = `${baseUrl}/safes/${safe}`;
//   const { data: result } = await query('GET', url);
//   return result;
// };

const getTransactions = async (chainId, safe) => {
  const baseUrl = getUrl(chainId);
  const url = `${baseUrl}/safes/${safe}/multisig-transactions`;
  const { data: result } = await query('GET', url);
  return {
    transactions: result.results,
  };
};

const estimateTx = async (chainId, safe, data) => {
  const baseUrl = getUrl(chainId);
  const url = `${baseUrl}/safes/${safe}/multisig-transactions/estimations/`;
  const response = await query('POST', url, data);
  return response.data;
};

const getNextNonce = async (chainId, safe) => {
  const { transactions } = await getTransactions(chainId, safe);
  return transactions?.length > 0
    ? (transactions[0].nonce || 0) + 1
    : 0;
};

// ///////////////////////////////////////////////////////////////
// PUBLIC METHODS
// ///////////////////////////////////////////////////////////////

exports.sendTx = async (chainId, safe, data) => {
  const baseUrl = getUrl(chainId);
  const url = `${baseUrl}/safes/${safe}/multisig-transactions/`;
  const { data: result } = await query('POST', url, data);
  return result;
};

exports.createTx = async (provider, chainId, safe, data, signer) => {
  const safeContract = new Contract(safe, GNOSIS_SAFE.abi, provider);
  const { safeTxGas } = await estimateTx(chainId, safe, data);
  const nonce = await getNextNonce(chainId, safe);
  const txData = {
    ...data,
    safe,
    safeTxGas,
    gasPrice: 0,
    baseGas: 0,
    gasToken: constants.AddressZero,
    refundReceiver: constants.AddressZero,
    nonce,
    sender: signer.address,
    origin: 'GQL Infrastructure Server',
  };
  const contractTransactionHash = await safeContract.getTransactionHash(
    txData.to,
    txData.value,
    txData.data,
    txData.operation,
    txData.safeTxGas,
    txData.baseGas,
    txData.gasPrice,
    txData.gasToken,
    txData.refundReceiver,
    txData.nonce,
  );
  /* eslint no-underscore-dangle: ["error", { "allow": ["_signingKey"] }] */
  const signature = utils.joinSignature(signer._signingKey().signDigest(contractTransactionHash));
  const result = {
    ...txData,
    contractTransactionHash,
    signature,
  };
  return result;
};
