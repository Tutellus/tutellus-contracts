const bre = require("hardhat");
const ethers = bre.ethers;

const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const IDO_USDT = ethers.utils.id("IDO_USDT");
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C";
const FUNDING_AMOUNT = ethers.utils.parseEther("30000");
const MIN_PREFUND = ethers.utils.parseEther("1000");
const TIME_OFFSET = 0
const START_DATE = 1661126400
const END_DATE = 1661299200
const IDO_TOKEN_AMOUNT = ethers.utils.parseEther("60000");

async function main() {
    bre.run("compile");
    const Manager = await ethers.getContractFactory("TutellusManager");
    const TutellusIDOFactory = await ethers.getContractFactory(
        "TutellusIDOFactory"
    );
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const Token = await ethers.getContractFactory("Token");

    const myIdoToken = await Token.deploy("Tutellus IDO 8", "IDO8")
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
