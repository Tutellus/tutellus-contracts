// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const ethers = hre.ethers;

const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C";
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run("compile");

    // // We get the contract to deploy
    const manager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const tx = await manager.grantRole(ethers.utils.id('UPGRADER_ROLE'), "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142")
    await tx.wait()
    // const factoryAddr = await manager.get(LAUNCHPAD_IDO_FACTORY);
    // const factory = await ethers.getContractAt(
    //     "TutellusIDOFactory",
    //     factoryAddr
    // );
    // const beaconAddr = await factory.beacon();
    const beacon = await ethers.getContractAt("UUPSUpgradeable", "0xB4f3b622C0A9Fa8B2efC2C943C455186D31044d1");
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const newImplementation = await TutellusIDO.deploy();
    await newImplementation.deployed();

    const response = await beacon.upgradeTo(newImplementation.address);
    await response.wait();
    console.log("New implementation: ", newImplementation.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
