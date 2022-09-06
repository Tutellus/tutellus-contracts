const { ethers, upgrades } = require("hardhat");

PROXY_ADDRESS = "0x23a6c2E4ac83179364d492Fc5bf5AE391a05B3Cf"
CONTRACT_NAME = "TutellusIDOFactory"

async function main() {
    const Factory = await ethers.getContractFactory(CONTRACT_NAME);
    const result = await upgrades.validateUpgrade(PROXY_ADDRESS, Factory, { kind: "uups", unsafeAllow: "constructor" })
    console.log("Valid")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
