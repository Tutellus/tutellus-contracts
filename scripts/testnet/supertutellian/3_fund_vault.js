const { ethers } = require("hardhat");

const ERC20_ID = ethers.utils.id("ERC20")
const REWARDS_ID = ethers.utils.id("SUPERTUTELLIANS_REWARDS")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const Token = await ethers.getContractFactory("Token")

    console.log("Funding...")
    const tokenAddress = await myManager.get(ERC20_ID)
    const rewardsAddress = await myManager.get(REWARDS_ID)
    const myToken = Token.attach(tokenAddress)
    await myToken.transfer(rewardsAddress, ethers.utils.parseEther("100000"))
    console.log("Funded")
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
