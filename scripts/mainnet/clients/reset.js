const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { createTx, sendTx } = require('../../../utils/gnosis');

const MERKLEROOT = '0x158b425888f63d68819d15f47aba5dbec10252b4590023eb47f2a23fad7ea2d9';
const URI = 'https://ipfs.io/ipfs/QmW16XiRURMCR5tnMQ4v4KtQXcH7T23FeoC7whVXtSx3sc';
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

const main = async () => {
    await hre.run('compile');

    const wallet = new Wallet(process.env.PRIVATE_KEY);

    const myClientsVault = await ethers.getContractAt('TutellusClientsVaultV2', '0x9E7b780Ebc944260081A443d5703D86DcAef002c');

    const data = {
        to: myClientsVault.address,
        data: myClientsVault.interface.encodeFunctionData('updateMerkleRoot', [
            MERKLEROOT,
            URI,
        ]),
        value: 0,
        operation: 0,
    };

    const chainId = ethers.provider._network.chainId;
    const txData = await createTx(provider, chainId, SAFE, data, wallet);
    // await sendTx(chainId, SAFE, txData);
    console.log('SafeTxHash:', txData.contractTransactionHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
