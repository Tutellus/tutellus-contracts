const { ethers } = require("hardhat");

const SUPERTUTELLIANS_ID = ethers.utils.id("SUPERTUTELLIANS")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const Supertutellians = await ethers.getContractFactory("Supertutellians")

    console.log("Deploying implementation...")
    const implementation = await Supertutellians.deploy()
    await implementation.deployed()
    console.log("Deployed: ", implementation.address)

    console.log("Deploying supertutellians...")
    const initializeCalldata = Supertutellians.interface.encodeFunctionData("initialize", []);
    const response = await myManager.deployProxyWithImplementation(SUPERTUTELLIANS_ID, implementation.address, initializeCalldata)
    await response.wait()
    const proxy = await myManager.get(SUPERTUTELLIANS_ID)
    console.log("Deployed: ", proxy)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
