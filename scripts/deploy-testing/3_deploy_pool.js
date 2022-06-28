const { ethers } = require('hardhat')
const bre = require('hardhat')

const TUT_AMOUNT = ethers.utils.parseEther('400000')
const WBTC_AMOUNT = '300000000'
const TUT_ADDRESS = '0x930f169A87545a8c6a3e7934d42d1582c03e1b35'
const ROLE_MANAGER_ADDRESS = '0x0e75e4D2041287813a693971634400EAe765910C'
const VAULT_ADDRESS = '0x83DEaE10817b53dC340710461Ea5117DcDEc5ba5'

async function main () {
    const signers = await ethers.getSigners()

    const WBTC = await ethers.getContractFactory('WBTC')
    const TutellusFarming = await ethers.getContractFactory('TutellusFarming')
    const myUniswapFactory = await ethers.getContractAt('UniswapV2Factory', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')
    const myRouter = await ethers.getContractAt('UniswapRouter', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')

    const myWBTC = await WBTC.deploy('Wrapped Bitcoin', 'WBTC')
    await myWBTC.deployed()
    const approvalbtc = await myWBTC.approve(myRouter.address, ethers.constants.MaxUint256)
    await approvalbtc.wait()
    const mintbtc = await myWBTC.mint(signers[0].address, WBTC_AMOUNT)
    await mintbtc.wait()

    const tut = await ethers.getContractAt('Token', TUT_ADDRESS)
    const myManager = await ethers.getContractAt('TutellusManager', ROLE_MANAGER_ADDRESS)
    const grantRole = await myManager.grantRole(ethers.utils.id('MINTER_ROLE'), signers[0].address)
    await grantRole.wait()
    const approval = await tut.approve(myRouter.address, ethers.constants.MaxUint256)
    await approval.wait()
    const mint = await tut.mint(signers[0].address, TUT_AMOUNT)
    await mint.wait()

    const tx = await myRouter.addLiquidity(
        TUT_ADDRESS,
        myWBTC.address,
        TUT_AMOUNT,
        WBTC_AMOUNT,
        0,
        0,
        signers[0].address,
        5379665533000, //2140
        { gasLimit: 10000000 }
    )
    await tx.wait()

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
