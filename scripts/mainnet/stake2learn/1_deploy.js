const { ethers } = require("hardhat");

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0x73205567d90A45533879eF39a29920056225eFB2"
const TOKEN = "0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d"
const POOL = "0x5d9ac8993b714df01d079d1b5b0b592e579ca099"
const FEEDS = [
    "0xc907E116054Ad103354f2D350FD2514433D57F6f",
]
const INVERTS = [
    false
]
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

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
            FEEDS,
            INVERTS
        ]
    );
    const factoryImplementation = await TutellusStake2LearnFactory.deploy()
    await factoryImplementation.deployed()
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const calldata = TutellusManager.interface.encodeFunctionData("deployProxyWithImplementation", [S2L_ID, factoryImplementation.address, factoryCalldata])
    const data = {
        to: MANAGER_ADDR,
        data: calldata,
        value: 0,
        operation: 0,
    };

    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const tx = await createTx(ethers.provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, tx);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
