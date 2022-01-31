const { create: ipfsHttpClient } = require('ipfs-http-client')
const { readFile } = require('fs/promises')
const { getBalanceTree } = require('../utils/balanceTree')
const path = require('path')
const jsonPath = '../examples/clients.json'
const json = require(jsonPath)

const data = {
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
}

const main = async () => {
  const ipfs = ipfsHttpClient(data)
  try {
    const file = await readFile(path.join(__dirname, jsonPath), 'utf8')
    const tree = getBalanceTree(json)
    const added = await ipfs.add(file)
    console.log('Uri: https://ipfs.io/ipfs/' + added.cid.toString())
    console.log('MerkleRoot: ', tree.toJSON().merkleRoot)
  } catch (error) {
    console.error('ERROR', error)
  }
}

main()
