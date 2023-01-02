const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0xcD650C9bE67Dcf3aA10DeBbefC4E3Be1D89F83cA": parseEther('100'),
    "0xABCBb4f73E0fA9eACe8b14e00558573e2eA954fa": parseEther('100'),
    "0xFbDC23b0BEd3D3b6B0395e338B7370083c201664": parseEther('100'),
    "0xc8Ca6aE1393F3b54BEc8720CfE82f6dd705B26A8": parseEther('100'),
    "0x0f4159b74173Fe8527b5D61BDaC7020584cd2851": parseEther('100'),
    "0xef6A5A06407c5e7aF0B0B66107C119830a4e8FD0": parseEther('100'),
    "0xbc9CB4C9eB7aD827a982A2f5E4C884fbca33F17A": parseEther('100'),
    "0x672b1528bf9d07eb4bCB77E36b28D29f71979C8E": parseEther('100'),
    "0x36663fcfc1E51c38F6b1E5b5D911615eBE569025": parseEther('100'),
    "0x4E75937566Cd63515f731E1032bd54a41D271Ba0": parseEther('100'),
    "0xfe9354CFF82B94C831640FEbC7457fA0bE2549e8": parseEther('100'),
    "0x836628BCE107Bb26f3d44054d2c05ff606B3A70E": parseEther('100'),
    "0x3BbE94B68884F2679BCd890316E178887cb2a3D7": parseEther('100'),
    "0x870656E3F0E07545C398Af6C7816cECC7c376c93": parseEther('520'),
    "0x41F5dBd2d4487343B32f5Fc5ABeFB5275791d8Ec": parseEther('100'),
    "0x88f3395EA1CdCa3026eAfeBbbf5a27A9774c67Df": parseEther('1510'),
    "0x21c7d882Df75E242989cf2BaE13546aD93dbb8b7": parseEther('2083'),
    "0x2b2aBa926A94221c5602dC82065610440102D613": parseEther('6237'),
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther('4902'),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther('4902'),
    "0xCc635856799219ff6E71DB3Cd6C2D1a44dd078BA": parseEther('100'),
    "0x943F393A589bBe39a4E55AB571ac1422de703063": parseEther('450'),
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
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log('Downloading current JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Concatenating JSONs...')
    const json = concatJson(json0, json1);
    const tree = getBalanceTree(json).toJSON();
    console.log('Uploading new JSON to IPFS...')
    const uri = await uploadJSON(json, tree.merkleRoot);
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

    // const tx = await myClientsVault.updateMerkleRoot(tree.merkleRoot, uri);
    // await tx.wait();
    // console.log('Completed.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
