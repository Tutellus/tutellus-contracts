const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { concatArrays, getWhitelistTree } = require('../../../utils/whitelistTree');

const ADDRESSES = [
    "0x22933773A6020fEB3bC10D4C8C8d47B033FA20cc"
];

const main = async () => {
    await hre.run('compile');

    const myWhitelist = await ethers.getContractAt('TutellusWhitelist', '0x7B6e624f144D6fA4792a6FCEc02F33E9E5e3BE27');
    console.log('Getting current uri...')
    const uri0 = await myWhitelist.uri();

    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    const currentAddress = json0.addresses ? json0.addresses : [];

    console.log('Creating merkle tree...')
    const json = {
        addresses: concatArrays(currentAddress, ADDRESSES)
    };
    const tree = getWhitelistTree(json.addresses).toJSON();

    console.log('Uploading new JSON to IPFS...')
    const uri = await uploadJSON(json, tree.merkleRoot);

    console.log('Updating contract... merkleRoot:', tree.merkleRoot, ', uri:', uri);
    const tx = await myWhitelist.updateMerkleRoot(tree.merkleRoot, uri);
    await tx.wait();

    console.log('Completed.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
