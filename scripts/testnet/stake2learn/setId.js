const { ethers } = require("hardhat");

const ID = ethers.utils.id("S2L_RECEIVER")
const ROLE = ethers.utils.id("S2L_SIGNER_ROLE")
const ADDRESS = "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142"
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);

    console.log("Granting...")
    let response = await myManager.grantRole(ROLE, ADDRESS)
    await response.wait()
    response = await myManager.setId(ID, ADDRESS)
    await response.wait()
    console.log("Granted")
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
