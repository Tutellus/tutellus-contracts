const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE')
const IDO_FACTORY_ADMIN_ROLE = ethers.utils.id('IDO_FACTORY_ADMIN_ROLE')
const IDO_ADMIN_ROLE = ethers.utils.id('IDO_ADMIN_ROLE')
const LAUNCHPAD_ADMIN_ROLE = ethers.utils.id('LAUNCHPAD_ADMIN_ROLE')

const MANAGER_ADDRESS = "0x73205567d90A45533879eF39a29920056225eFB2"
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main() {
    const TutellusManager = await ethers.getContractFactory("TutellusManager");

    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const chainId = ethers.provider._network.chainId;

    const calldataGrantRole = TutellusManager.interface.encodeFunctionData('grantRole', [
        WHITELIST_ADMIN_ROLE,
        SAFE
    ])
    const dataGrantRole = {
        to: MANAGER_ADDRESS,
        data: calldataGrantRole,
        value: 0,
        operation: 0,
    };
    const txGrantRole = await createTx(ethers.provider, chainId, SAFE, dataGrantRole, wallet);
    await sendTx(chainId, SAFE, txGrantRole);

    console.log("Sent")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
