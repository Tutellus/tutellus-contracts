const hre = require("hardhat");
const ethers = hre.ethers;

const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C";
const S2L_FACTORY = ethers.utils.id("S2L_FACTORY");

async function main() {
    const manager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const factoryAddr = await manager.get(S2L_FACTORY);
    const factory = await ethers.getContractAt(
        "TutellusStake2LearnFactory",
        factoryAddr
    );
    const TutellusStake2Learn = await ethers.getContractFactory("TutellusStake2Learn");
    const newImplementation = await TutellusStake2Learn.deploy();
    await newImplementation.deployed();

    const response = await factory.upgradeByImplementation(newImplementation.address);
    await response.wait();
    console.log("New implementation: ", newImplementation.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
