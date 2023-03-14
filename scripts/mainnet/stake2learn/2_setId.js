const { ethers } = require("hardhat");
const { createTx, sendTx } = require('../../../utils/gnosis');

const ID = ethers.utils.id("S2L_RECEIVER")
const ROLE = ethers.utils.id("S2L_SIGNER_ROLE")
// const ADDRESS = "0x44eEdBEE931A5dc22a5f4Ad441679FD5C0e38D38"
const ADDRESS = "0x6d2aeA076B1E1deb491df73E20546c21F8a3d458"
const MANAGER_ADDR = "0x73205567d90A45533879eF39a29920056225eFB2"
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main() {
    await ethers.provider.getBalance(SAFE)
    console.log("Granting...")
    const TutellusManager = await ethers.getContractFactory("TutellusManager");

    //role
    // const calldata = TutellusManager.interface.encodeFunctionData("grantRole", [ROLE, ADDRESS])

    //id
    const calldata = TutellusManager.interface.encodeFunctionData("setId", [ID, ADDRESS])

    const data = {
        to: MANAGER_ADDR,
        data: calldata,
        value: 0,
        operation: 0,
    };

    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const chainId = ethers.provider._network.chainId;
    const tx = await createTx(ethers.provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, tx);
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
