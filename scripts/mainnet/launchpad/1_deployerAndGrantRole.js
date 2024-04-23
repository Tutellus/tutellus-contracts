const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const MANAGER_ADDRESS = "0xa5D0A86fBd67166251d33A950c4Beb2683836C24"
const SAFE = "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142"

async function main() {
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDRESS);
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const TutellusLaunchpadDeployer = await ethers.getContractFactory("TutellusLaunchpadDeployer");

    const deployer = await TutellusLaunchpadDeployer.deploy(SAFE)
    await deployer.deployed()

    // const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    // const chainId = ethers.provider._network.chainId;
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

    await myManager.grantRole(DEFAULT_ADMIN_ROLE, deployer.address)

    // const calldataGrantRole = TutellusManager.interface.encodeFunctionData('grantRole', [
    //     DEFAULT_ADMIN_ROLE,
    //     deployer.address
    // ])

    // const dataGrantRole = {
    //     to: MANAGER_ADDRESS,
    //     data: calldataGrantRole,
    //     value: 0,
    //     operation: 0,
    // };

    // const txGrantRole = await createTx(ethers.provider, chainId, SAFE, dataGrantRole, wallet);
    // await sendTx(chainId, SAFE, txGrantRole);

    console.log("Deployed:", deployer.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
