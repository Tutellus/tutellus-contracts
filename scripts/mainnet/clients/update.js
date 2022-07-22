const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');
const { assert } = require('assert');

const json1 = {
    "0x5Ba393A21Baf111cA14F5Cf73643333a13f3272F": parseEther("2262").toString(),
    "0x351356843A8cFDB726C757014b47E1291315217f": parseEther("800").toString(),
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

const main = async () => {
    await hre.run('compile');

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

    const data = myClientsVault.interface.encodeFunctionData('updateMerkleRoot', [
        tree.merkleRoot,
        uri,
    ]);

    console.log('URI:', uri);
    console.log('Data:', data);

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
