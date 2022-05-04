const bre = require('hardhat')
const ethers = bre.ethers

const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');

const RV_ADDRESS = '0xC6a1d70f9C3e3666C0F0373ee3B5D8D34949d6C5';
const AMOUNT = parseEther('10000000').toString();

const json1 = {};

json1[RV_ADDRESS] = AMOUNT; 

async function main () {
    await bre.run('compile');
    const myClientsVault = await ethers.getContractAt('TutellusClientsVault', '0x1f358e074e6f5A40aDD369206c2A0ffeCf847f23');

    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Concatenating JSONs...')
    const json = concatJson(json0, json1);
    const tree = getBalanceTree(json).toJSON();

    const claim = tree.claims[RV_ADDRESS];

    console.log('Uploading new JSON to IPFS...')
    const uri = await uploadJSON(json, tree.merkleRoot);
    console.log('Updating contract... merkleRoot:', tree.merkleRoot, ', uri:', uri);
    const tx = await myClientsVault.updateMerkleRoot(tree.merkleRoot, uri);
    await tx.wait();
    console.log('Updated.');  

    console.log('Claiming...');
    const claimtx = await myClientsVault.claim(
        claim.index,
        RV_ADDRESS,
        claim.amount,
        claim.proof,
    );
    await claimtx.wait();
    console.log('Completed.');  
    
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })