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
    const withdraw = object[key]['withdraw']
    const energy = object[key]['energy']
    assert(validAmount(allocation), ERROR_INVALID_JSON)
    assert(validAmount(withdraw), ERROR_INVALID_JSON)
    assert(validAmount(energy), ERROR_INVALID_JSON)
  })
}

const toArray = (object = {}) => {
  const sortedKeys = Object.keys(object).sort()
  return sortedKeys.reduce((acu, key) => {
    acu.push({
      account: key,
      allocation: BigNumber.from(object[key]['allocation']),
      withdraw: BigNumber.from(object[key]['withdraw']),
      energy: BigNumber.from(object[key]['energy'])
    })
    return acu
  }, [])
}

const toHexNode = (array = []) =>
  array.map(({ account, allocation, withdraw, energy }, index) =>
    keccak256({ index, account, allocation, withdraw, energy })
  )

// keccak256(abi.encode(index, account, amount))
const keccak256 = ({ index, account, allocation, withdraw, energy }) => {
  // console.log('> keccak256', index, account, allocation, withdraw)
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256'], [index, account, allocation, withdraw, energy]).substr(2),
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

  const getProof = ({ index, account, allocation, withdraw, energy }) =>
    tree.getHexProof(keccak256({ index, account, allocation, withdraw, energy }))

  const allocationTotal =
    distributionArray.reduce(
      (acu, { allocation }) => acu.add(allocation),
      BigNumber.from(0)
    )

  const withdrawTotal =
    distributionArray.reduce(
      (acu, { withdraw }) => acu.add(withdraw),
      BigNumber.from(0)
    )

  const energyTotal =
    distributionArray.reduce(
      (acu, { energy }) => acu.add(energy),
      BigNumber.from(0)
    )

  const claims =
    distributionArray.reduce((acu, { account, allocation, withdraw, energy }, index) => {
      // console.log('claims', account, allocation, withdraw, energy, index)
      acu[account] = {
        index,
        allocation: allocation.toHexString(),
        withdraw: withdraw.toHexString(),
        energy: energy.toHexString(),
        proof: getProof({ index, account, allocation, withdraw, energy })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      allocationTotal: allocationTotal.toHexString(),
      withdrawTotal: withdrawTotal.toHexString(),
      energyTotal: energyTotal.toHexString(),
      claims
    })
  }
}
