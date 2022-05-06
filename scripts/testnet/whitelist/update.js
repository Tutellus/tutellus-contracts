const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { concatArrays, getWhitelistTree } = require('../../../utils/whitelistTree');

const ADDRESSES = [
    "0x30729B6910757042024304E56BEB015821462691",
    "0xff529c047ecfe2f78caf41e84773c4f865ef84f1",
    "0x71a6cedac992f6ee61b439a5aa053d8c638ec409",
    "0x22933773a6020feb3bc10d4c8c8d47b033fa20cc",
];

const main = async () => {
    await hre.run('compile');

    const myWhitelist = await ethers.getContractAt('TutellusWhitelist', '0x130EfDEb1B1ad62d1DEcD812B80fFD252CE2f95D');
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
