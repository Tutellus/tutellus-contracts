const { ethers } = require("hardhat");

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const TutellusStake2LearnFactory = await ethers.getContractFactory("TutellusStake2LearnFactory")

    console.log("Upgrading...")
    const response = await myManager.deploy(S2L_ID, TutellusStake2LearnFactory.bytecode, "0x")
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
