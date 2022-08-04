const { utils, BigNumber } = require('ethers')
const assert = require('assert')
const MerkelTree = require('./merkleTree')
const ERROR_INVALID_JSON = 'JSON not valid'

const validAmount = amount => {
  const fNum = parseInt(amount)
  return typeof amount === 'string' && !isNaN(fNum)
}

const checkValidJSON = (object = {}) => {
  Object.keys(object).forEach(key => {
    assert(utils.isAddress(key), ERROR_INVALID_JSON)
    const allocation = object[key]['allocation']
    const refund = object[key]['refund']
    const energy = object[key]['energy']
    assert(validAmount(allocation), ERROR_INVALID_JSON)
    assert(validAmount(refund), ERROR_INVALID_JSON)
    assert(validAmount(energy), ERROR_INVALID_JSON)
  })
}

const toArray = (object = {}) => {
  const sortedKeys = Object.keys(object).sort()
  return sortedKeys.reduce((acu, key) => {
    acu.push({
      account: key,
      allocation: BigNumber.from(object[key]['allocation']),
      refund: BigNumber.from(object[key]['refund']),
      energy: BigNumber.from(object[key]['energy'])
    })
    return acu
  }, [])
}

const toHexNode = (array = []) =>
  array.map(({ account, allocation, refund, energy }, index) =>
    keccak256({ index, account, allocation, refund, energy })
  )

// keccak256(abi.encode(index, account, amount))
const keccak256 = ({ index, account, allocation, refund, energy }) => {
  // console.log('> keccak256', index, account, allocation, refund)
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256'], [index, account, allocation, refund, energy]).substr(2),
    'hex'
  )
}

exports.checkValidJSON = (distributionJSON) => {
  checkValidJSON(distributionJSON)
}

exports.getIdoTree = (distributionJSON) => {
  checkValidJSON(distributionJSON)
  const distributionArray = toArray(distributionJSON)
  const nodesArray = toHexNode(distributionArray)
  const tree = MerkelTree(nodesArray)

  const getProof = ({ index, account, allocation, refund, energy }) =>
    tree.getHexProof(keccak256({ index, account, allocation, refund, energy }))

  const allocationTotal =
    distributionArray.reduce(
      (acu, { allocation }) => acu.add(allocation),
      BigNumber.from(0)
    )

  const refundTotal =
    distributionArray.reduce(
      (acu, { refund }) => acu.add(refund),
      BigNumber.from(0)
    )

  const energyTotal =
    distributionArray.reduce(
      (acu, { energy }) => acu.add(energy),
      BigNumber.from(0)
    )

  const claims =
    distributionArray.reduce((acu, { account, allocation, refund, energy }, index) => {
      // console.log('claims', account, allocation, refund, energy, index)
      acu[account] = {
        index,
        allocation: allocation.toHexString(),
        refund: refund.toHexString(),
        energy: energy.toHexString(),
        proof: getProof({ index, account, allocation, refund, energy })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      allocationTotal: allocationTotal.toHexString(),
      refundTotal: refundTotal.toHexString(),
      energyTotal: energyTotal.toHexString(),
      claims
    })
  }
}
