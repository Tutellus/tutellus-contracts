const { ethers } = require("hardhat")

const MANAGER_ADDRESS = "0x6299f2B57f9E4A9Ae246eAf8Aa6DA57B4d2f8f2B"
const TUT_ADDRESS = "0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d"
const LP_ADDRESS = "0x5d9ac8993b714df01d079d1b5b0b592e579ca099"
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

async function main() {
    const accounts = await ethers.getSigners()

    const manager = await ethers.getContractAt("TutellusManager", MANAGER_ADDRESS);
    const tut = await ethers.getContractAt("TutellusERC20", TUT_ADDRESS);
    const lp = await ethers.getContractAt("Token", LP_ADDRESS);
    const usdt = await ethers.getContractAt("Token", USDT_ADDRESS);
    const idoFactoryAddr = await manager.get(ethers.utils.id("LAUNCHPAD_IDO_FACTORY"))
    const factory = await ethers.getContractAt("TutellusIDOFactory", idoFactoryAddr)
    const factionManagerAddr = await manager.get(ethers.utils.id("FACTION_MANAGER"))
    const factionManager = await ethers.getContractAt("TutellusFactionManager", factionManagerAddr)
    const whitelistAddr = await manager.get(ethers.utils.id("WHITELIST"))
    const whitelist = await ethers.getContractAt("TutellusWhitelist", whitelistAddr)

    //Whitelist addr
    let response = await manager.grantRole(ethers.utils.id("WHITELIST_ADMIN_ROLE"), accounts[0].address)
    await response.wait()
    response = await whitelist.addFromRole(accounts[0].address)
    await response.wait()

    //Deploy an IDO
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const FUNDING_AMOUNT = ethers.utils.parseEther("100000");
    const MIN_PREFUND = ethers.utils.parseEther("0");
    const START_DATE = parseInt(Date.now()/1000)
    const END_DATE = START_DATE + 1000000
    const idoInitializeCalldata = TutellusIDO.interface.encodeFunctionData(
        "initialize",
        [manager.address, FUNDING_AMOUNT, MIN_PREFUND, ethers.constants.AddressZero, USDT_ADDRESS, START_DATE, END_DATE, 0]
    );
    response = await manager.grantRole(ethers.utils.id("IDO_FACTORY_ADMIN_ROLE"), accounts[0].address)
    await response.wait()
    response = await factory.createProxy(idoInitializeCalldata);
    let receipt = await response.wait()
    const myIdo = TutellusIDO.attach(receipt.events[2].args.proxy)

    //Faction
    response = await tut.approve(factionManagerAddr, ethers.constants.MaxUint256)
    await response.wait()
    const tutBalance = await tut.balanceOf(accounts[0].address)

    response = await factionManager.stake(
        ethers.utils.id("NAKAMOTOS_FACTION"),
        accounts[0].address,
        tutBalance
    )
    await response.wait()

    response = await lp.approve(factionManagerAddr, ethers.constants.MaxUint256)
    await response.wait()
    const lpBalance = await lp.balanceOf(accounts[0].address)

    response = await factionManager.stakeLP(
        ethers.utils.id("NAKAMOTOS_FACTION"),
        accounts[0].address,
        lpBalance
    )
    await response.wait()

    //IDO
    response = await myIdo.acceptTermsAndConditions()
    await response.wait()
    response = await usdt.approve(myIdo.address, ethers.constants.MaxUint256)
    await response.wait()
    const usdtBalance = await usdt.balanceOf(accounts[0].address)
    await response.wait()
    response = await myIdo.prefund(accounts[0].address, usdtBalance)
    await response.wait()
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
