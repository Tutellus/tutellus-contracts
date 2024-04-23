const { ethers } = require("hardhat");

const SUPERTUTELLIANS_ID = ethers.utils.id("SUPERTUTELLIANS")
const MANAGER_ADDR = "0xa5D0A86fBd67166251d33A950c4Beb2683836C24"

async function main() {
    const Supertutellians = await ethers.getContractFactory("Supertutellians")
    console.log("Deploying implementation...")
    const implementation = await Supertutellians.deploy()
    await implementation.deployed()
    console.log("Deployed: ", implementation.address)
    const initializeCalldata = Supertutellians.interface.encodeFunctionData("initialize", []);
    console.log("Hash :", SUPERTUTELLIANS_ID)
    console.log("Calldata :", initializeCalldata)
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    await myManager.deployProxyWithImplementation(SUPERTUTELLIANS_ID, implementation.address, initializeCalldata)
    console.log("SUPERTUTELLIAN :", await myManager.get(SUPERTUTELLIANS_ID))
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
