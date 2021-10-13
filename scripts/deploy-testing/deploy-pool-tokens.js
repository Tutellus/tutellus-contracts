const bre = require('hardhat')
const Token = bre.artifacts.require('TutellusERC20')
const RoleManager = bre.artifacts.require('TutellusRoleManager')

const {
  ether, expectRevert, time
} = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
const { BigNumber } = require('@ethersproject/bignumber')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()
  const myAddress = await bre.web3.eth.getAccounts()
  const MS = '0xA45eE5aE23eb0F0f2a3CB8A70fd9C5727715dA60'
  const amount = ether('1000000')
  const myRoleManager = await RoleManager.new()
  const myToken = await Token.new('TestPool1', 'TP1', amount, myRoleManager.address)
  await myRoleManager.grantMinterRole(myAddress[0])
  await myToken.mint(MS, amount)
  console.log('Token:', myToken.address)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
