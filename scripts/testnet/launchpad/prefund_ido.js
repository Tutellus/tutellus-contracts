const bre = require("hardhat");
const ethers = bre.ethers;

const IDO_USDT = ethers.utils.id("IDO_USDT");
const IDO_ADDR = "0x01F8779256d144B218E7E93439044CFDDa02830c";
const PREFUND_AMOUNTS = [
    ethers.utils.parseEther("14000"), //0x07
    ethers.utils.parseEther("10000"), //0x07
    ethers.utils.parseEther("1000"), //0x07
    ethers.utils.parseEther("8000"), //0x72
    ethers.utils.parseEther("7500"), //0x72
    ethers.utils.parseEther("1400"), //0x72
    ethers.utils.parseEther("8000"), //0x0e
    ethers.utils.parseEther("1300"), //0x0e
    ethers.utils.parseEther("7000"), //0x0e
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
