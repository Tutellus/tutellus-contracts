const { ethers } = require('hardhat')
const { createTx, sendTx } = require('../../../utils/gnosis');

const MANAGER_ADDRESS = "0x92204B41803Dd82e638C629c1bCAf17FD2023660"
const SAFE = "0x144884904F833cc0D0e62787b6761A46712C28F4"

async function main() {
    const signers = await ethers.getSigners()
    const nonce = await ethers.provider.getTransactionCount(signers[0].address)
    const nextContract = await ethers.utils.getContractAddress({
        from: signers[0].address,
        nonce: nonce + 6 //6 because deploy of implementations
    })
    console.log("Contract address:", nextContract)
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

    const data = {
        to: MANAGER_ADDRESS,
        data: TutellusManager.interface.encodeFunctionData('grantRole', [
            DEFAULT_ADMIN_ROLE,
            nextContract,
        ]),
        value: 0,
        operation: 0,
    };

    const chainId = ethers.provider._network.chainId;
    const txData = await createTx(ethers.provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, txData);
    console.log("Gnosis sent")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
