const bre = require("hardhat");
const ethers = bre.ethers;

const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY_V2");
const IDO_USDT = ethers.utils.id("IDO_USDT");
const MANAGER_ADDR = "0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45";
const FUNDING_AMOUNT = ethers.utils.parseEther("30000");
const MIN_PREFUND = ethers.utils.parseEther("1000");
const TIME_OFFSET = 0
const START_DATE = parseInt(Date.now()/1000) + TIME_OFFSET
const END_DATE = START_DATE + 86400000 + TIME_OFFSET
const IDO_TOKEN_AMOUNT = ethers.utils.parseEther("60000");

async function main() {
    bre.run("compile");
    const Manager = await ethers.getContractFactory("TutellusManager");
    const TutellusIDOFactory = await ethers.getContractFactory(
        "TutellusIDOFactory"
    );
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const Token = await ethers.getContractFactory("Token");

    const myIdoToken = await Token.deploy("Tutellus IDO 4", "IDO4")
    await myIdoToken.deployed()
    const myManager = Manager.attach(MANAGER_ADDR);
    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    const idoUsdtAddr = await myManager.get(IDO_USDT);
    const myIdoFactory = TutellusIDOFactory.attach(idoFactoryAddr);
    const initializeCalldata = TutellusIDO.interface.encodeFunctionData(
        "initialize",
        [MANAGER_ADDR, FUNDING_AMOUNT, MIN_PREFUND, myIdoToken.address, idoUsdtAddr, START_DATE, END_DATE, 0]
    );
    const response = await myIdoFactory.createProxy(initializeCalldata);
    const receipt = await response.wait()

    console.log(
        "IDO: ",
        receipt.events[2].args.proxy
    );

    const mintTx = await myIdoToken.mint(receipt.events[2].args.proxy, IDO_TOKEN_AMOUNT)
    await mintTx.wait()
    console.log("IDO token minted...")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
