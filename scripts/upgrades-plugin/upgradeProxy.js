const { ethers, upgrades } = require("hardhat");

const PROXY_ADDR = "0x7bC9dFE6dC96Df94446914867F43D32A65e9367c"
CONTRACT_NAME = ""

async function main() {
    const Factory = await ethers.getContractFactory(CONTRACT_NAME);
    const contract = await upgrades.upgradeProxy(PROXY_ADDR, Factory);
    console.log("Ready to upgrade, implementation:", contract);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
