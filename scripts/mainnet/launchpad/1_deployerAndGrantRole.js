const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const MANAGER_ADDRESS = "0x2d0550620b17D748379273dC9E903E8298410Ccc"
const SAFE = "0x144884904F833cc0D0e62787b6761A46712C28F4"

async function main() {
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const TutellusLaunchpadDeployer = await ethers.getContractFactory("TutellusLaunchpadDeployer");

    const deployer = await TutellusLaunchpadDeployer.deploy(SAFE)
    await deployer.deployed()

    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const chainId = ethers.provider._network.chainId;
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

    const calldataGrantRole = TutellusManager.interface.encodeFunctionData('grantRole', [
        DEFAULT_ADMIN_ROLE,
        deployer.address
    ])

    const dataGrantRole = {
        to: MANAGER_ADDRESS,
        data: calldataGrantRole,
        value: 0,
        operation: 0,
    };

    const txGrantRole = await createTx(ethers.provider, chainId, SAFE, dataGrantRole, wallet);
    await sendTx(chainId, SAFE, txGrantRole);

    console.log("Deployed:", deployer.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
