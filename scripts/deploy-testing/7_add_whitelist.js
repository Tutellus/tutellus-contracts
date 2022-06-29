const hre = require('hardhat');
const { downloadJSON, uploadJSON } = require('../../utils/ipfs');
const { parseEther } = require('ethers/lib/utils');
const { concatArrays, getWhitelistTree } = require('../../utils/whitelistTree');

const ADD_ADDRESSES = [
    "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142",
    "0xCC18024a12FcF2099693cB6C22eb127765Ae6dbf",
    "0x0DD1AC51cBaDD3e4DFa98DdD07E383d4706b7732",
    "0xfF529C047ecFe2F78cAF41E84773C4f865eF84F1"
];

const main = async () => {
    await hre.run('compile');

    const myWhitelist = await ethers.getContractAt('TutellusWhitelist', '0x7B6e624f144D6fA4792a6FCEc02F33E9E5e3BE27');
    console.log('Getting current uri...')
    const uri0 = await myWhitelist.uri();

    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    const currentAddresses = json0.addresses ? json0.addresses : [];
    const tree = getWhitelistTree(currentAddresses).toJSON();

    for(let i in currentAddresses) {
        const address = currentAddresses[i]
        const claim = tree.claims[address];
        const isWhitelisted = await myWhitelist.whitelisted(address);
        if (!isWhitelisted && ADD_ADDRESSES.includes(address)) {
            console.log('Adding account:', address);
            const tx = await myWhitelist.add(
                claim.index,
                address,
                claim.proof
            );
            await tx.wait();
        }
    } 
    console.log('Completed.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});