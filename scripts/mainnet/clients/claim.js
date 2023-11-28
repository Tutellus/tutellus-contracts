const hre = require('hardhat');
const { ethers } = hre;
const { downloadJSON } = require('../../../utils/ipfs');
const { getBalanceTree } = require('../../../utils/balanceTree');

const ADDRESS = "0x5ACB3043da168b59b775eA28F3942597F45e9543";

const main = async () => {
    await hre.run('compile');

    const myToken = await ethers.getContractAt('TutellusERC20', '0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d');

    const prevBalance = await myToken.balanceOf(ADDRESS);
    console.log(prevBalance.toString());

    const myClientsVault = await ethers.getContractAt('TutellusClientsVaultV2', '0x9E7b780Ebc944260081A443d5703D86DcAef002c');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const uriArray = uri0.split('/');
    const cid = uriArray[uriArray.length - 1];
    console.log('CID:', cid)
    const json = await downloadJSON(cid);
    console.log('Concatenating JSONs...')
    const tree = getBalanceTree(json).toJSON();

    const claimData = tree.claims[ADDRESS];

    console.log('Claiming...')
    const tx = await myClientsVault.claim(
        claimData.index,
        ADDRESS,
        claimData.amount,
        claimData.proof,
    );
    await tx.wait();
    console.log('Claimed!')

    const postBalance = await myToken.balanceOf(ADDRESS);
    console.log(postBalance.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
