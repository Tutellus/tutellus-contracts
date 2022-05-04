const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');

const json1 = {
    '0x30729B6910757042024304E56BEB015821462691': '1',
}


const main = async () => {
    await hre.run('compile');

    const myClientsVault = await ethers.getContractAt('TutellusClientsVault', '0xe5248f3d79626b934a5524e0a18fdf7a0d52cef2');
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
    const tx = await myClientsVault.updateMerkleRoot(tree.merkleRoot, uri);
    await tx.wait();
    console.log('Completed.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
