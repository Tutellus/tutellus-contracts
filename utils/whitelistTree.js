const { utils } = require('ethers')
const assert = require('assert')
const MerkelTree = require('./merkleTree')
const { getAddress, isAddress } = require('ethers/lib/utils')
const ERROR_INVALID_ARRAY = 'array not valid'

const checkValidArray = (array = []) => {
  array.forEach(key => {
    assert(utils.isAddress(key), ERROR_INVALID_ARRAY)
  })
}

const toHexNode = (array = []) =>
  array.map((account, index) =>
    keccak256({ index, account })
  )

const keccak256 = ({ index, account }) => {
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address'], [index, account]).substr(2),
    'hex'
  )
}

const checksumArray = (addresses) => addresses.filter(
  address => isAddress(address)
).map(
  address => getAddress(address)
).sort();

exports.concatArrays = (
  arrayA,
  arrayB,
) => {
  const cArrayA = checksumArray(arrayA);
  const cArrayB = checksumArray(arrayB);
  return [...new Set(cArrayA.concat(cArrayB))];
};

exports.getWhitelistTree = (whitelist = []) => {
  checkValidArray(whitelist)
  const cWhitelist = checksumArray(whitelist)
  const nodesArray = toHexNode(cWhitelist)
  const tree = MerkelTree(nodesArray)

  const getProof = ({ index, account }) =>
    tree.getHexProof(keccak256({ index, account }))


  const claims =
    cWhitelist.reduce((acu, account, index) => {
      acu[account] = {
        index,
        proof: getProof({ index, account })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      claims
    })
  }
}
