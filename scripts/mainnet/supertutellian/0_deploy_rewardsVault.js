const { ethers } = require("hardhat");

const REWARDS_ID = ethers.utils.id("TUT_IP1_RECIPIENT")
const MANAGER_ADDR = "0x73205567d90A45533879eF39a29920056225eFB2"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const TutellusRewardsVaultV2 = await ethers.getContractFactory("TutellusRewardsVaultV2_1")

    const signers = await ethers.getSigners()
    const deployer = signers[0]

    const balancePre = await deployer.provider.getBalance(deployer.address)

    console.log("Deploying implementation...")
    const implementation = await TutellusRewardsVaultV2.deploy()
    await implementation.deployed()

    const initializeCalldata = TutellusRewardsVaultV2.interface.encodeFunctionData("reinitialize", []);
    console.log("Hash:", REWARDS_ID)
    console.log("Implementation:", implementation.address)
    console.log("Data:", initializeCalldata)
    const proxy = await myManager.get(REWARDS_ID)
    console.log("Deployed: ", proxy)

    const balancePost = await deployer.provider.getBalance(deployer.address)

    console.log("Cost: ", ethers.utils.formatEther(balancePre.sub(balancePost).toString()))

}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
