const { ethers } = require("hardhat");

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const TutellusStake2Learn = await ethers.getContractFactory("TutellusStake2Learn")
    const factoryAddress = await myManager.get(S2L_ID)
    const factory = await ethers.getContractAt("TutellusStake2LearnFactory", factoryAddress)

    console.log("Deploying implementation...")
    const implementation = await TutellusStake2Learn.deploy()
    await implementation.deployed()
    console.log("Deployed: ", implementation.address)

    console.log("Upgrading...")
    const response = await factory.upgradeByImplementation(implementation.address)
    await response.wait()
    console.log("Upgraded")
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
