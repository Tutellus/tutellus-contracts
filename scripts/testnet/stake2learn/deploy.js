const { ethers } = require("hardhat");

const S2L_ID = ethers.utils.id("S2L")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"
const TOKEN = "0x930f169A87545a8c6a3e7934d42d1582c03e1b35"
const POOL = "0xfd5447D667eB6960fA326cfa68b7936f52940cA7"
const STAKING = "0xfFe1f66624758BC1D64E60a27b8D34B6140B9220"
const FEEDS = [
    "0xA39434A63A52E749F02807ae27335515BA4b07F7",
    "0xe6571E6995bf9A61781bBA9d63b488EbCC98d9eF"
]
const INVERTS = [
    false,
    true
]

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const TutellusStake2LearnFactory = await ethers.getContractFactory("TutellusStake2LearnFactory")
    const TutellusStake2Learn = await ethers.getContractFactory("TutellusStake2Learn")

    console.log("Deploying implementation...")
    const implementation = await TutellusStake2Learn.deploy()
    await implementation.deployed()
    console.log("Deployed: ", implementation.address)
    // const implementation = await ethers.getContractAt(TutellusStake2Learn, "0x0EfcDA5794bC3Ecb1A434473ca3c3291414DA388")

    console.log("Deploying factory...")
    const factoryCalldata = TutellusStake2LearnFactory.interface.encodeFunctionData(
        "initialize",
        [
            implementation.address,
            TOKEN,
            POOL,
            STAKING,
            FEEDS,
            INVERTS
        ]
    );
    const factoryImplementation = await TutellusStake2LearnFactory.deploy()
    await factoryImplementation.deployed()
    const response = await myManager.deployProxyWithImplementation(S2L_ID, factoryImplementation.address, factoryCalldata)
    await response.wait()
    const factory = await myManager.get(S2L_ID)
    console.log("Deployed: ", factory)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
