const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther("9090").toString(),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther("12727").toString(),
    "0x135907936537a44763817AC7Fc30abaec9a81Fab": parseEther("100").toString(),
    "0x00964BB483a3bf16CEC8001f1D26408E04b8bee5": parseEther("100").toString(),
    "0xB04A9baEac8400ab2F841feA9aefdE9030e8F706": parseEther("100").toString(),
    "0x4483326668c7e63116b51BCd282c230706EbeDc2": parseEther("100").toString(),
    "0x5F6D71CD8404E661Cb4736e368564C01A7Ff9852": parseEther("100").toString(),
    "0xcD650C9bE67Dcf3aA10DeBbefC4E3Be1D89F83cA": parseEther("100").toString(),
    "0xF50a7C4eA595eE4Eb81BCbEd3Ea6929d8D5B69a7": parseEther("100").toString(),
    "0x5ACB3043da168b59b775eA28F3942597F45e9543": parseEther("300000").toString(),
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
