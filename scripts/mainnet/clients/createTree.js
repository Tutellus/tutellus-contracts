const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { getBalanceTree } = require('../../../utils/balanceTree');
const { parseEther } = require('ethers/lib/utils');
require('dotenv').config();

const PROJECT_ID = process.env.INFURA_IPFS_PROJECT_ID
const PROJECT_SECRET  = process.env.INFURA_IPFS_PROJECT_SECRET

const URI = "https://ipfs.io/ipfs/QmWfEpQ7AyAUNFLZFD6n8F2us4gbZLZLpXtA6HmHBZFL9c"

const SAMPLE = {
    "0xB5B077CB356F8a7050ac1939B356e4f9e9E3517C": parseEther("1000").toString(),
    "0xDB970fD8Ed083D0Dc6000fa1e4973F27d8eDA2A9": parseEther("1000").toString(),
    "0x71a6CeDAc992F6ee61b439A5aa053D8c638ec409": parseEther("1000").toString(),
    "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142": parseEther("1000").toString(),
    "0x30729B6910757042024304E56BEB015821462691": parseEther("1000").toString(),
    "0x22933773A6020fEB3bC10D4C8C8d47B033FA20cc": parseEther("1000").toString(),
    "0x6011C90AD69DA2193CFE55Fc8521aa4Eb40A5FF4": parseEther("1000").toString(),
    "0x9017981eAb2B2cC348ad382b0a3e4a0AeFA7EF54": parseEther("1000").toString(),
};

const main = async () => {
    let json = SAMPLE;
    // if ((!json || Object.keys(json).length === 0) && URI) {
    //     json = await downloadJSON(URI);
    // }
    const tree = getBalanceTree(json).toJSON();
    const uri = await uploadJSON({
        json,
        merkleRoot: tree.merkleRoot,
        projectId: PROJECT_ID,
        projectSecret: PROJECT_SECRET,
    });
    console.log({
        tree: JSON.stringify(tree, null, 2),
        uri,
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
