const { ethers } = require("hardhat");
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"
const EUR_USD = "104000000"
const FEED_EUR_USD = ethers.utils.id("FEED_EUR_USD")

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);

    console.log("Deploying implementation...")
    const AggregatorMock = await ethers.getContractFactory("AggregatorMock")
    const eurUsdCalldata = AggregatorMock.interface.encodeFunctionData("initialize", ["8", EUR_USD]);
    await myManager.deploy(FEED_EUR_USD, AggregatorMock.bytecode, eurUsdCalldata)
    const eurUsdFeed = await myManager.get(FEED_EUR_USD)
    console.log("Deployed: ", eurUsdFeed)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
