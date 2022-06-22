const { ethers } = require('hardhat')
const bre = require('hardhat')

const TUT_AMOUNT = ethers.utils.parseEther('400000')
const WBTC_AMOUNT = ethers.utils.parseEther('100000')
const TUT_ADDRESS = '0x7F42C954DffaB4dddfdF3dDE8238d9840671B4a8'
const ROLE_MANAGER_ADDRESS = '0x06223cb5CB01191521e07a2e65dD1E0430E0705b'
const VAULT_ADDRESS = '0x6d3dC0fbC904034c8D14a3132a529f1B4DdD2f13'

async function main () {
    const signers = await ethers.getSigners()

    const Token = await ethers.getContractFactory('Token')
    const TutellusFarming = await ethers.getContractFactory('TutellusFarming')
    const myUniswapFactory = await ethers.getContractAt('UniswapV2Factory', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')
    const myRouter = await ethers.getContractAt('UniswapRouter', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')

    const myWBTC = await Token.deploy('Wrapped Bitcoin', 'WBTC')
    await myWBTC.deployed()
    await myWBTC.approve(myRouter.address, ethers.constants.MaxUint256)
    const tut = await ethers.getContractAt('Token', TUT_ADDRESS)

    const myManager = await ethers.getContractAt('TutellusManager', ROLE_MANAGER_ADDRESS)
    const grantRole = await myManager.grantRole(ethers.utils.id('MINTER_ROLE'), signers[0].address)
    await grantRole.wait()
    await tut.approve(myRouter.address, ethers.constants.MaxUint256)
    await tut.mint(signers[0].address, TUT_AMOUNT)

    await myRouter.addLiquidity(
        TUT_ADDRESS,
        myWBTC.address,
        TUT_AMOUNT,
        WBTC_AMOUNT,
        TUT_AMOUNT,
        WBTC_AMOUNT,
        signers[0].address,
        Date.now()
    )

    const pairAddress = await myUniswapFactory.getPair(TUT_ADDRESS, myWBTC.address)
    console.log('Pool:', pairAddress)
    const farming = await TutellusFarming.deploy(pairAddress, ROLE_MANAGER_ADDRESS, VAULT_ADDRESS)
    await farming.deployed()
    console.log('Farming:', farming.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
