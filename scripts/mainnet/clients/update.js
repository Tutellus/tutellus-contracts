const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x6d2aeA076B1E1deb491df73E20546c21F8a3d458": parseEther("300000").toString(),
}

const checkWallets = (json) => {
    const wallets = Object.keys(json);
    wallets.forEach(wallet => {
        if (isAddress(wallet)) {
            return;
        } else {
            throw new Error(`Invalid wallet address: ${wallet}`);
        }
    })
}

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

const main = async () => {
    await hre.run('compile');

    const wallet = new Wallet(process.env.PRIVATE_KEY);

    checkWallets(json1);

    const myClientsVault = await ethers.getContractAt('TutellusClientsVaultV2', '0x9E7b780Ebc944260081A443d5703D86DcAef002c');
    const uri0 = await myClientsVault.uri();
    console.log('Uri0:', uri0)
    const json0 = await downloadJSON(uri0);
    console.log('Concatenating JSONs...')
    const json = concatJson(json0, json1);
    const tree = getBalanceTree(json).toJSON();
    const uri = await uploadJSON(json, tree.merkleRoot);
    console.log('Uri:', uri)
    console.log('Verifying JSONs...')
    const newJson = await downloadJSON(uri);
    const extraction = extractJson({
        base: json0,
        newJson,
    });
    console.log('Comparing JSONs...')
    console.log('json1:', json1)
    console.log('extraction:', extraction)
    compareJson({
        jsonA: json1,
        jsonB: extraction,
    });
    console.log('Updating contract... merkleRoot:', tree.merkleRoot, ', uri:', uri);
    const data = {
        to: myClientsVault.address,
        data: myClientsVault.interface.encodeFunctionData('updateMerkleRoot', [
            tree.merkleRoot,
            uri,
        ]),
        value: 0,
        operation: 0,
    };

    const chainId = ethers.provider._network.chainId;
    const txData = await createTx(provider, chainId, SAFE, data, wallet);
    // await sendTx(chainId, SAFE, txData);
    console.log('SafeTxHash:', txData.contractTransactionHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
