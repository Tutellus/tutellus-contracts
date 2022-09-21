const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const REWARDSVAULT_ADDRESS = "0xd1306d5A2A074C3F33E94346d8d3DB05c624EB24"
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main() {
    const TutellusRewardsVaultV2 = await ethers.getContractFactory("TutellusRewardsVaultV2");

    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const chainId = ethers.provider._network.chainId;
    const rewardPerBlock = ethers.utils.parseEther("21000000").div((ethers.BigNumber.from("31556926").mul(ethers.BigNumber.from("5")).div(ethers.BigNumber.from("2"))))

    const calldata = TutellusRewardsVaultV2.interface.encodeFunctionData('setRewardPerBlock', [
        rewardPerBlock
    ])
    const data = {
        to: REWARDSVAULT_ADDRESS,
        data: calldata,
        value: 0,
        operation: 0,
    };
    const tx = await createTx(ethers.provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, tx);

    console.log("Sent")
    console.log(rewardPerBlock)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
