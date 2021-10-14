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
  const currentBlock = await time.latestBlock()
  const blocksPerYear = 15778800

  const myStaking = await Staking.at('0x6163fb268392416Bc5bCADC487731ceb1DDc3EC9')
  // const myFarming = await Farming.at('0xcb51316AfEbb61daB52F1aBb1bbbA8EA6a975a5a')
  const myRewardsVault = await RewardsVault.at('0xc0be60ac345594d57092211FDF3EDaC02d53cD56')
  // const myPool = await IERC20.at('')

  const [balance, releasedYear, stakingInfo] = await Promise.all([
    myStaking.balance(),
    myRewardsVault.releasedRange(currentBlock, currentBlock + blocksPerYear),
    myRewardsVault.info(myStaking.address)
  ])

  const stakingAllocation = stakingInfo[0]
  const stakingReleasedYear = releasedYear * stakingAllocation / ether('100')
  const apr = 100 * stakingReleasedYear / balance 
  console.log(`Staking APR: ${apr}%`)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })