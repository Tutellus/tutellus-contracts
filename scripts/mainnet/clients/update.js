const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x5ACB3043da168b59b775eA28F3942597F45e9543": parseEther("200000").toString(),
    "0x45D88d81bB0D18158744db80F3082eE34CbB15ad": parseEther("100").toString(),
    "0x927fD041336fC3A71504C9db6b19be080203f674": parseEther("100").toString(),
    "0x4cFD4cCeC4e22f063B2d2207C100dd750bA4EF91": parseEther("100").toString(),
    "0x35C6886a0Ea454A7f38E2AAeDD9B199F5B53301A": parseEther("50").toString(),
    "0xDC1f6f50f9b42C8a10462712Fe12914A2f625720": parseEther("50").toString(),
    "0x45E6BDE9014D944D790d9f289eA50325e10cBc42": parseEther("50").toString(),
    "0x44493D8Db718c2636A9670469270397c65D67955": parseEther("38960").toString(),
    "0x5F6D71CD8404E661Cb4736e368564C01A7Ff9852": parseEther("9730").toString(),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther("8930").toString(),
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther("8930").toString(),
    "0x2b2aBa926A94221c5602dC82065610440102D613": parseEther("5840").toString(),
    "0xc5dfdc9cf523a84c0d1c38D5A5FFC20e10a13331": parseEther("100").toString(),
    "0x55868d006Cb227F1265DEfC96bD020509802bb6e": parseEther("100").toString(),
}

const checkWallets = (json) => {
    const wallets = Object.keys(json);
    wallets.forEach(wallet => {
        if (isAddress(wallet)) {
            return;
        } else {
            throw new Error(`Invalid wallet address": ${wallet}`);
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
    console.log('Uploading JSON...', tree.merkleRoot)
    const uri = await uploadJSON({
        json,
        merkleRoot: tree.merkleRoot,
    });
    console.log('Uri:', uri)
    console.log('Verifying JSONs...')
    const newJson = await downloadJSON(uri);
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
