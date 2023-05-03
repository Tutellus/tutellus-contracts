const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson, extractJson, compareJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0x9ae21712497825Ddea48c9BD8C8218E6315da7CF": parseEther("200").toString(),
    "0xb2Cd14f4f505161bC79f9F28571993721C564132": parseEther("16600").toString(),
    "0x0888682F937d65695CdBC1e3139B5B68e0CC45Ed": parseEther("200").toString(),
    "0x1820408BF7100b5808687C05BA60F71223129b76": parseEther("200").toString(),
    "0x9de6753359f57a0e9d43768d3b47bcd1a567c17a": parseEther("100").toString(),
    "0x5338A2A2E1b3AB3C759F27337198562A44Fec977": parseEther("100").toString(),
    "0x56a57433010adA66A4a01B1FF86F35a07A5f7F3e": parseEther("11067").toString(),
    "0xBcE483aC9a7EFb94F084bEA2CC7c03fd1b236dfc": parseEther("1850").toString(),
    "0x44493D8Db718c2636A9670469270397c65D67955": parseEther("1850").toString(),
    "0x8c04702673f8453d9Bb08142557C8E937498c350": parseEther("8333").toString(),
    "0x6f173eFbFF72c7b30c64fC38fDaB81C34Ad32b43": parseEther("8333").toString(),
    "0x2b2aBa926A94221c5602dC82065610440102D613": parseEther("11000").toString(),
    "0x9e7685Da4EFfbe6a35266989f4F3040dc39C36eD": parseEther("5553").toString(),
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
