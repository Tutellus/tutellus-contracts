const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');

const json1 = {
    '0x354F349547269a6C3DF3300040Ae908aC003490d': parseEther('150').toString(),
    '0xa30B2B7e5E09a26528373a21062e9c3277AF7bB2': parseEther('100').toString(),
    '0x351356843A8cFDB726C757014b47E1291315217f': parseEther('100').toString(),
    '0x65A3E526a42118c29C90ab74AEAe3F5b2A261182': parseEther('50').toString(),
    '0x27823E16c50f0Afb593253e8608ED2594B5f36bA': parseEther('100').toString(),
    '0x81EC959A48756984C2c94DB1BF9D4BB18746Ee2A': parseEther('250').toString(),
    '0x8C04515a76E7196D2AbF67C505C4a83788f16fDb': parseEther('165').toString(),
}


const main = async () => {
    await hre.run('compile');

    const myClientsVault = await ethers.getContractAt('TutellusClientsVault', '0xe5248f3d79626b934a5524e0a18fdf7a0d52cef2');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Concatinating JSONs...')
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
