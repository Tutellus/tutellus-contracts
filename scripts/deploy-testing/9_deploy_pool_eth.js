const { ethers } = require('hardhat')
const bre = require('hardhat')

const TOKEN_AMOUNT = "20000000"
const ETH_AMOUNT = ethers.utils.parseEther('4')
const TOKEN_ADDRESS = '0xdDeC57D4a1D852F8035D6f35c1fC5A0B02a89591'

async function main () {
    const signers = await ethers.getSigners()

    const myUniswapFactory = await ethers.getContractAt('UniswapV2Factory', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')
    const myRouter = await ethers.getContractAt('UniswapRouter', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')

    const weth = myRouter.WETH()
    const tut = await ethers.getContractAt('Token', TOKEN_ADDRESS)
    const approval = await tut.approve(myRouter.address, ethers.constants.MaxUint256)
    await approval.wait()
    const mint = await tut.mint(signers[0].address, TOKEN_AMOUNT)
    await mint.wait()

    const tx = await myRouter.addLiquidityETH(
        TOKEN_ADDRESS,
        TOKEN_AMOUNT,
        0,
        0,
        signers[0].address,
        5379665533000, //2140
        { gasLimit: 10000000, value: ETH_AMOUNT }
    )
    await tx.wait()

    const pairAddress = await myUniswapFactory.getPair(TOKEN_ADDRESS, weth)
    console.log('Pool:', pairAddress)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
