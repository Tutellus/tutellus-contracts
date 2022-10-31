const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0xBcE483aC9a7EFb94F084bEA2CC7c03fd1b236dfc": parseEther('200'),
    "0x3BbE94B68884F2679BCd890316E178887cb2a3D7": parseEther('5334'),
    "0x786beb0943870C5896fedA3c2Ef42E4768362D3b": parseEther('667'),
    "0x36663fcfc1E51c38F6b1E5b5D911615eBE569025": parseEther('967'),
    "0x9bA34015169D84aB24C45a10E70B5b3A760e79E0": parseEther('667'),
    "0xbc9CB4C9eB7aD827a982A2f5E4C884fbca33F17A": parseEther('667'),
    "0x5ff45726EC12F28c2975f4772546298ba6dBd3F2": parseEther('388'),
    "0x79c699B6e424223E0A576d760A8b8a8aAB4E341D": parseEther('50'),
    "0x0926F398EFba85e913e362d7B320F6E100d8E23d": parseEther('50'),
    "0xE74e741e3db668F9aBD1dAf96851a3586d5B35B4": parseEther('667'),
    "0xFbDC23b0BEd3D3b6B0395e338B7370083c201664": parseEther('334'),
    "0x81EC959A48756984C2c94DB1BF9D4BB18746Ee2A": parseEther('234'),
    "0x2b2aBa926A94221c5602dC82065610440102D613": parseEther('4000'),
    "0x354F349547269a6C3DF3300040Ae908aC003490d": parseEther('1000'),
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther('3667'),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther('3667'),
    "0x88f3395EA1CdCa3026eAfeBbbf5a27A9774c67Df": parseEther('1000'),
}

const checkWallets = (json) => {
    const wallets = Object.keys(json);
    wallets.forEach(wallet => {
        if (isAddress(wallet)) {
            return;
        } else {
            throw new Error(`Invalid wallet address: ${wallet}`);
        }
    })
}

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

const main = async () => {
    await hre.run('compile');

    const wallet = new Wallet(process.env.PRIVATE_KEY);

    checkWallets(json1);

    const myClientsVault = await ethers.getContractAt('TutellusClientsVaultV2', '0x9E7b780Ebc944260081A443d5703D86DcAef002c');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Concatenating JSONs...')
    const json = concatJson(json0, json1);
    const tree = getBalanceTree(json).toJSON();
    console.log('Uploading new JSON to IPFS...')
    const uri = await uploadJSON(json, tree.merkleRoot);
    console.log('Updating contract... merkleRoot:', tree.merkleRoot, ', uri:', uri);

    const data = {
        to: myClientsVault.address,
        data: myClientsVault.interface.encodeFunctionData('updateMerkleRoot', [
            tree.merkleRoot,
            uri,
        ]),
        value: 0,
        operation: 0,
    };

    const chainId = ethers.provider._network.chainId;
    const txData = await createTx(provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, txData);
    console.log('SafeTxHash:', txData.contractTransactionHash)

    // const tx = await myClientsVault.updateMerkleRoot(tree.merkleRoot, uri);
    // await tx.wait();
    // console.log('Completed.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
