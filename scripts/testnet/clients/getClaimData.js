const hre = require('hardhat');
const { downloadJSON } = require('../../../utils/ipfs');
const { getBalanceTree } = require('../../../utils/balanceTree');

const main = async () => {
    await hre.run('compile');
    const myClientsVault = await ethers.getContractAt('TutellusClientsVault', '0x1f358e074e6f5A40aDD369206c2A0ffeCf847f23');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    const tree = getBalanceTree(json0).toJSON();
    const claimData = tree.claims['0x30729B6910757042024304E56BEB015821462691'];
    const claimable = await myClientsVault.leftToClaim(
        claimData.index,
        '0x30729B6910757042024304E56BEB015821462691',
        claimData.amount,
        claimData.proof,
    );
    console.log(claimData, claimable);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
