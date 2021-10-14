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
  const accounts = await bre.web3.eth.getAccounts()
  const myAddress = accounts[4]
  const amount = ether('1000000')
  const myRoleManager = await RoleManager.new({ from: myAddress })
  const myToken = await Token.new('Test1234', 'Test1234', amount, myRoleManager.address, { from: myAddress })
  await myRoleManager.grantMinterRole(myAddress, { from: myAddress })
  await myToken.mint(myAddress, amount, { from: myAddress })
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