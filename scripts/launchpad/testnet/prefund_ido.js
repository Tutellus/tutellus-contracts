const bre = require("hardhat");
const ethers = bre.ethers;

const IDO_USDT = ethers.utils.id("IDO_USDT");
const IDO_ADDR = "0xb52DAeeEA7a3F1BC8574768e09238d6Ab4B0f362";
const PREFUND_AMOUNTS = [
    ethers.utils.parseEther("14000"),
    ethers.utils.parseEther("20000"),
    ethers.utils.parseEther("11000"),
    ethers.utils.parseEther("8000"),
    ethers.utils.parseEther("12000"),
    ethers.utils.parseEther("7000"),
    ethers.utils.parseEther("8000"),
    ethers.utils.parseEther("12000"),
    ethers.utils.parseEther("7000"),
]

async function main() {
    bre.run("compile");
    const accounts = await ethers.getSigners()
    const Manager = await ethers.getContractFactory("TutellusManager");
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const Token = await ethers.getContractFactory("Token");

    const myManager = Manager.attach(
        "0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45"
    );
    const usdtAddr = await myManager.get(IDO_USDT);
    console.log(IDO_USDT)
    console.log(usdtAddr)
    const myUsdt = Token.attach(usdtAddr);
    const myIdo = TutellusIDO.attach(IDO_ADDR);

    let response
    for (let i = 0; i < PREFUND_AMOUNTS.length; i++) {
        response = await myUsdt.connect(accounts[i]).approve(myIdo.address, ethers.constants.MaxUint256)
        await response.wait()
        response = await myUsdt.transfer(accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
        response = await myIdo.connect(accounts[i]).prefund(PREFUND_AMOUNTS[i])
        await response.wait()
    }
    console.log("Prefund finished...")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
