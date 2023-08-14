const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x3Ec024281d8E56513C378bd3c0b6595321DFD126": parseEther("175").toString(),
    "0xd5Cc90a5DE8d861975c6887B3F66C8585B4d8e9d": parseEther("175").toString(),
    "0x94cfb1D77Ca69041a8a0d7B372c7c115cFDded71": parseEther("175").toString(),
    "0xe26769c7062dEc9c840587816A3E04e48cE3e516": parseEther("175").toString(),
    "0x6bd9Cbc55bDBaB4C5E177C6a4684A6D50C17b378": parseEther("175").toString(),
    "0x0d1d63e739145FdDE049e84F66526066f8108BC7": parseEther("175").toString(),
    "0x0888682F937d65695CdBC1e3139B5B68e0CC45Ed": parseEther("175").toString(),
    "0xBd3C19d910265F2cFF7E3fbC04c1Dc1882fd053B": parseEther("175").toString(),
    "0xF58393102bcd8D077154d613806027dA10eA9cbC": parseEther("175").toString(),
    "0x0CC466844440141f1313346F6cb09e3e8180B8A7": parseEther("175").toString(),
    "0x9F16367bD6860541138Aaf77782C57cE7Ee31ac2": parseEther("175").toString(),
    "0xde9De4a91Bd9F45B3979A979a3b9460CEB8A57e0": parseEther("175").toString(),
    "0x2caC4A423866c439054E4D10Ce006946c10E6399": parseEther("175").toString(),
    "0x61573d947392ce25EBcbc5c7211BB5955DE53eD1": parseEther("175").toString(),
    "0x7D6c736F532ff02D853b1ee553D0A869372886d1": parseEther("175").toString(),
    "0xd06f10829c3d6e882c7A37583D15D3D331C8EC02": parseEther("175").toString(),
    "0xd8Ad9e10cbb278C751056b5a9cE113773f959776": parseEther("175").toString(),
    "0x46b188667c74152d5dbb5875A6EA2766d79aAF7f": parseEther("175").toString(),
    "0x0F2c1c43Da56F484e2FCCb4223070eCdf4cAD9c5": parseEther("175").toString(),
    "0xA94c5460587A8b4c8100AFAdCee68bAB2Fad76E6": parseEther("1020").toString(),
}

const checkWallets = (json) => {
    const wallets = Object.keys(json);
    wallets.forEach(wallet => {
        if (isAddress(wallet)) {
            return;
        } else {
            throw new Error(`Invalid wallet address": parseEther("175").toString(), ${wallet}`);
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
