const { ethers } = require("hardhat");

const SUPERTUTELLIANS_ID = ethers.utils.id("SUPERTUTELLIANS")
const REWARDS_ID = ethers.utils.id("SUPERTUTELLIANS_REWARDS")
const ST_ADMIN_ROLE = ethers.utils.id("ST_ADMIN_ROLE")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const TutellusRewardsVaultV2 = await ethers.getContractFactory("TutellusRewardsVaultV2")
    const Supertutellians = await ethers.getContractFactory("Supertutellians")

    console.log("Config...")
    const rewardsAddress = await myManager.get(REWARDS_ID)
    const supertutelliansAddress = await myManager.get(SUPERTUTELLIANS_ID)
    const myRewardsVault = TutellusRewardsVaultV2.attach(rewardsAddress)
    const mySupertutellians = Supertutellians.attach(supertutelliansAddress)
    await myRewardsVault.setRewardPerBlock(ethers.utils.parseEther('1'))
    await myRewardsVault.add(mySupertutellians.address, [ethers.utils.parseEther('100')])
    await myManager.grantRole(ST_ADMIN_ROLE, "0xcd7669aafffb7f683995e6ed9b53d1e5fe72c142")
    await mySupertutellians.updateConfig("86400", ethers.utils.parseEther("100"), ethers.utils.parseEther("1000"), "864000")
    console.log("Configurated")
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
