const { ethers, upgrades } = require("hardhat");

CONTRACT_NAME = "TutellusIDOFactory"

async function main() {
    const Factory = await ethers.getContractFactory(CONTRACT_NAME);
    const proxy = await upgrades.deployProxy(Factory, { kind: "uups", unsafeAllow: "constructor" });
    await proxy.deployed();
    console.log("Proxy deployed to:", proxy.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
