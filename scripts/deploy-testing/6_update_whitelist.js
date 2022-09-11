const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { concatArrays, getWhitelistTree } = require('../../utils/whitelistTree');

const ADDRESSES = [
    "0xB5B077CB356F8a7050ac1939B356e4f9e9E3517C",
    "0x9017981eAb2B2cC348ad382b0a3e4a0AeFA7EF54",
    "0x6011C90AD69DA2193CFE55Fc8521aa4Eb40A5FF4",
    "0x30729B6910757042024304E56BEB015821462691",
    "0xff529c047ecfe2f78caf41e84773c4f865ef84f1",
    "0x71a6cedac992f6ee61b439a5aa053d8c638ec409",
    "0x22933773a6020feb3bc10d4c8c8d47b033fa20cc",
    "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142",
    "0xCC18024a12FcF2099693cB6C22eb127765Ae6dbf",
    "0x0DD1AC51cBaDD3e4DFa98DdD07E383d4706b7732",
    "0x5230D67f28FcE38644146e0E6CA8701c08946768",
    "0xAC30ea9377b3Ef77eE2E47bCf74CfF47Af46B5Ae",
    "0x6895d1723FAee121B452421489612B1DE602A9E3",
    "0xE2e3F75e1D385998b50558320B7A16353D902577",
    "0xA552168c0971C523d6f03800ee58d4377189c7AB",
    "0x34DECa2c3224fd8F3e5e7D7745a6Af327ff362a2",
    "0xfF529C047ecFe2F78cAF41E84773C4f865eF84F1",
    "0xDB970fD8Ed083D0Dc6000fa1e4973F27d8eDA2A9",
    "0xABA884287995177e20B93A71fA7B729aA55020C2"
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
