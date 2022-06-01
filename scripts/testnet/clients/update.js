const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');

const json1 = {
    '0x30729B6910757042024304E56BEB015821462691': parseEther('50000').toString(),
    '0x22933773A6020fEB3bC10D4C8C8d47B033FA20cc': parseEther('50000').toString(),
    '0x71a6CeDAc992F6ee61b439A5aa053D8c638ec409': parseEther('50000').toString(),
}

const main = async () => {
    await hre.run('compile');
    const myClientsVault = await ethers.getContractAt('TutellusClientsVault', '0x1f358e074e6f5A40aDD369206c2A0ffeCf847f23');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Concatenating JSONs...')
    const json = concatJson({}, json1);
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
