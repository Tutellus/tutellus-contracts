const { utils, BigNumber } = require('ethers')
const assert = require('assert')
const MerkelTree = require('./merkleTree')
const { getAddress, isAddress } = require('ethers/lib/utils')
const ERROR_INVALID_JSON = 'JSON not valid'

const validAmount = amount => {
  const fNum = parseInt(amount)
  return typeof amount === 'string' && !isNaN(fNum)
}

const checkValidJSON = (object = {}) => {
  Object.keys(object).forEach(key => {
    assert(utils.isAddress(key), ERROR_INVALID_JSON)
    const amount = object[key]
    assert(validAmount(amount), ERROR_INVALID_JSON)
  })
}

const toArray = (object = {}) => {
  const sortedKeys = Object.keys(object).sort()
  return sortedKeys.reduce((acu, key) => {
    acu.push({
      account: getAddress(key),
      amount: BigNumber.from(object[key])
    })
    return acu
  }, [])
}

const toHexNode = (array = []) =>
  array.map(({ account, amount }, index) =>
    keccak256({ index, account, amount })
  )

// keccak256(abi.encode(index, account, amount))
const keccak256 = ({ index, account, amount }) => {
  // console.log('> keccak256', index, account, amount)
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address', 'uint256'], [index, account, amount]).substr(2),
    'hex'
  )
}

const getSortedUniqueKeys = (jsonA, jsonB) => {
  const allKeys = [
    ...Object.keys(jsonA),
    ...Object.keys(jsonB),
  ];
    // Unique and sorted
  return [...new Set(allKeys)].sort();
};

const checksumJson = (json) => {
  const keys = Object.keys(json);
  const response = {};
  keys.map(key => {
    const fKey = getAddress(key);
    if (isAddress(fKey)) {
      response[fKey] = json[key];
    }
  })
  return response;
}

exports.concatJson = (
  jsonA,
  jsonB,
) => {
  const cJsonA = checksumJson(jsonA);
  const cJsonB = checksumJson(jsonB);
  const sortedKeys = getSortedUniqueKeys(cJsonA, cJsonB);
  return sortedKeys.reduce((acu, key) => {
    acu[key] = BigNumber.from(cJsonA[key] || 0).add(BigNumber.from(cJsonB[key] || 0)).toString(); // eslint-disable-line no-param-reassign
    return acu;
  }, {});
};

exports.extractJson = ({
  base,
  newJson,
}) => {
  const cJsonA = checksumJson(base);
  const cJsonB = checksumJson(newJson);
  const sortedKeys = getSortedUniqueKeys(cJsonA, cJsonB);
  return sortedKeys.reduce((acu, key) => {
    const baseAmount = BigNumber.from(cJsonA[key] || 0);
    const newAmount = BigNumber.from(cJsonB[key] || 0);
    if (newAmount.gt(baseAmount)) {
      acu[key] = newAmount.sub(baseAmount).toString(); // eslint-disable-line no-param-reassign
    }
    return acu;
  }, {});
};

exports.compareJson = ({
  jsonA,
  jsonB,
}) => {
  const cJsonA = checksumJson(jsonA);
  const cJsonB = checksumJson(jsonB);
  const sortedKeys = getSortedUniqueKeys(cJsonA, cJsonB);
  sortedKeys.forEach(key => {
    const amountA = BigNumber.from(cJsonA[key] || 0);
    const amountB = BigNumber.from(cJsonB[key] || 0);
    assert(amountA.eq(amountB), 'JSON not equal');
  })
  return true;
};

exports.checkValidJSON = (balanceJSON) => {
  checkValidJSON(balanceJSON)
}

exports.getBalanceTree = (balanceJSON) => {
  checkValidJSON(balanceJSON)
  const cBalanceJSON = checksumJson(balanceJSON);
  const balanceArray = toArray(cBalanceJSON)
  const nodesArray = toHexNode(balanceArray)
  const tree = MerkelTree(nodesArray)

  const getProof = ({ index, account, amount }) =>
    tree.getHexProof(keccak256({ index, account, amount }))

  const tokenTotal =
    balanceArray.reduce(
      (acu, { amount }) => acu.add(amount),
      BigNumber.from(0)
    )

  const claims =
    balanceArray.reduce((acu, { account, amount }, index) => {
      // console.log('claims', account, amount, index)
      acu[account] = {
        index,
        amount: amount.toHexString(),
        proof: getProof({ index, account, amount })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      tokenTotal: tokenTotal.toHexString(),
      claims
    })
  }
}
