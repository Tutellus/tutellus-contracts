const bre = require('hardhat')
const Token = bre.artifacts.require('Token')
const { ether } = require('@openzeppelin/test-helpers')
const fs = require('fs')
const scanners = require('../../scanners.json')
const { networks } = require('../../hardhat.config')
const { utils } = require('ethers')

const scannerSet = () => {
  const chainId = networks[bre.network.name].chainId
  scanners.current = chainId.toString()

  fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main () {
  await bre.run('compile')
  scannerSet()

  const [owner] = await bre.web3.eth.getAccounts()

  const myToken = await Token.at('0xa47a02188fD2d3A2B4fEb0983e90851473016378')
  console.log('Token at: ', myToken.address)
  const [supply, cap, burned] = await Promise.all([
    myToken.totalSupply(),
    myToken.cap(),
    myToken.burned()
  ])

  const supplyEth = utils.formatEther(supply.toString())
  const capEth = utils.formatEther(cap.toString())
  const burnedEth = utils.formatEther(burned.toString())

  const mintableEth = capEth - supplyEth - burnedEth

  await myToken.mint(owner, ether(mintableEth.toString()))
  console.log(`Minted ${mintableEth} tokens to`, owner)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
