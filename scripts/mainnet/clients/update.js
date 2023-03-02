const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x5F6D71CD8404E661Cb4736e368564C01A7Ff9852": parseEther("4228.860333").toString(),
    "0xef6A5A06407c5e7aF0B0B66107C119830a4e8FD0": parseEther("100").toString(),
    "0x9e7685Da4EFfbe6a35266989f4F3040dc39C36eD": parseEther("400").toString(),
    "0xc6f53efd2c6806B78FCe59A4D55507B1E3624128": parseEther("546").toString(),
    "0x1820408BF7100b5808687C05BA60F71223129b76": parseEther("200").toString(),
    "0xbc9CB4C9eB7aD827a982A2f5E4C884fbca33F17A": parseEther("200").toString(),
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther("5050").toString(),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther("5050").toString(),
    "0x2b2aBa926A94221c5602dC82065610440102D613": parseEther("3212").toString(),
    "0x86484061e228d7578Ad898DEE2CacCAbc3A4ABa5": parseEther("100").toString(),
    "0x9ae21712497825Ddea48c9BD8C8218E6315da7CF": parseEther("100").toString(),
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
    // await sendTx(chainId, SAFE, txData);
    console.log('SafeTxHash:', txData.contractTransactionHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
