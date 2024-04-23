const { ethers } = require("hardhat");
const { createTx, sendTx } = require('../../../utils/gnosis');

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0xa5D0A86fBd67166251d33A950c4Beb2683836C24"
const TOKEN = "0x18c7541E6660bA04a19309AeD146ded6afe7B9fF"
const POOL = "0x8d34F5E8B953A01099a30f59dBB42AD2F6FdD619"
const FEEDS = [
    "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
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
    // const implementation = await ethers.getContractAt("TutellusStake2Learn", "0xeA9c1F482ca1343c8192B1EF458666105976636E")

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
    await myManager.deployProxyWithImplementation(S2L_ID, factoryImplementation.address, factoryCalldata)
    console.log("S2L Factory :", await myManager.get(S2L_ID))
    // const factoryImplementation = await ethers.getContractAt("TutellusStake2LearnFactory", "0x8093C1d3e6Faab67d35C0B1494Eb5a6E031d1E68")
    // const TutellusManager = await ethers.getContractFactory("TutellusManager");
    // const calldata = TutellusManager.interface.encodeFunctionData("deployProxyWithImplementation", [S2L_ID, factoryImplementation.address, factoryCalldata])
    // const data = {
    //     to: MANAGER_ADDR,
    //     data: calldata,
    //     value: 0,
    //     operation: 0,
    // };

    // const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    // const chainId = ethers.provider._network.chainId;
    // const tx = await createTx(ethers.provider, chainId, SAFE, data, wallet);
    // await sendTx(chainId, SAFE, tx);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
