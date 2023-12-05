const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x5ACB3043da168b59b775eA28F3942597F45e9543": parseEther("400000").toString()
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
    const uriOld = await myClientsVault.uri();
    console.log('Uri Old:', uriOld)
    const uriArray = uriOld.split('/');
    const cid = uriArray[uriArray.length - 1];
    console.log('CID:', cid)
    const json0 = await downloadJSON(cid);
    console.log('Concatenating JSONs...')
    const json = concatJson(json0, json1);
    const tree = getBalanceTree(json).toJSON();
    console.log('Uploading JSON...', tree.merkleRoot)
    const {uri, cid: newCid} = await uploadJSON({
        json,
        merkleRoot: tree.merkleRoot,
    });
    console.log('Uri:', uri)
    console.log('New CID:', newCid)
    console.log('Verifying JSONs...')
    const newJson = await downloadJSON(newCid);
    const extraction = extractJson({
        base: json0,
        newJson,
    });
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
    await sendTx(chainId, SAFE, txData);
    console.log('SafeTxHash:', txData.contractTransactionHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
