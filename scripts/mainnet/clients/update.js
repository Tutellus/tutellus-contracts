const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');
const { getBalanceTree, concatJson } = require('../../../utils/balanceTree');
const { createTx, sendTx } = require('../../../utils/gnosis');

const json1 = {
    "0xc4b5b82143eedab80c7c9edd912b3f746dd7151c": ethers.BigNumber.from("272727272727272727272"),
    "0x2a960a9b4fabaca80b9624f7d18e33a9276cedb5": ethers.BigNumber.from("25587126086454545454545"),
    "0x8b6fa5d5d313273b4c9355b60d36c908ff9f61cf": ethers.BigNumber.from("7891168501909090909087"),
    "0xbc9cb4c9eb7ad827a982a2f5e4c884fbca33f17a": ethers.BigNumber.from("545454593454545454541"),
    "0x9ae21712497825ddea48c9bd8c8218e6315da7cf": ethers.BigNumber.from("1090909090909090909090"),
    "0x6011c90ad69da2193cfe55fc8521aa4eb40a5ff4": ethers.BigNumber.from("872727272727272727272"),
    "0xe9c01f1f79d1d36381c445721de88ed79c2a3420": ethers.BigNumber.from("218181818181818181818"),
    "0x9e4e098475a969e255fb8d4e6c8844662344259b": ethers.BigNumber.from("587425468363636363636"),
    "0x9e7685da4effbe6a35266989f4f3040dc39c36ed": ethers.BigNumber.from("20270586827999999999996"),
    "0xbb7770befea11e40fbf47d1f8776f759ff3892b8": ethers.BigNumber.from("545454545454545454545"),
    "0x5b2daa876cfbb4fe17a7b06795730423aa4717ca": ethers.BigNumber.from("436363636363636363636"),
    "0x943f393a589bbe39a4e55ab571ac1422de703063": ethers.BigNumber.from("4764451552909090909087"),
    "0xa156730475e7266deb879d5041a3e48a3c87d8ed": ethers.BigNumber.from("2752361692636363636363"),
    "0x66e2495aebca70c141f3936cb6f6d2e6464a5d99": ethers.BigNumber.from("1060112108727272727272"),
    "0xcaa67cb622475c328be6a77e034096c6a67c3cfb": ethers.BigNumber.from("12715414624363636363635"),
    "0x6f0d7d31f8124621a91c7d27803f60dbf54e42bc": ethers.BigNumber.from("16362763636363636363636"),
    "0x28d7f622e8f356023d59a30b6a744fc15acce1e5": ethers.BigNumber.from("378182547818181818179"),
    "0xe4be496cf9307052e06ae0e999d5119327750329": ethers.BigNumber.from("629280121090909090908"),
    "0x354f349547269a6c3df3300040ae908ac003490d": ethers.BigNumber.from("5729644138909090909089"),
    "0x63bb872b4878324d5767767ede3f74717d9256c8": ethers.BigNumber.from("3281803289454545454545"),
    "0x75dddfb045c0f0ef72d940fe935bf36e773eb05b": ethers.BigNumber.from("229090909090909090909"),
    "0x4cfd4ccec4e22f063b2d2207c100dd750ba4ef91": ethers.BigNumber.from("769496950090909090908"),
    "0xea3bb5e9ecd08eb183fe7e51d90f4f42606f7b85": ethers.BigNumber.from("10621267600363636363636"),
    "0x743a356ac36e9030465c7c72ac11e9a551a556ce": ethers.BigNumber.from("244145744727272727272"),
    "0x64f9c8144e8c8faf1743911ebe5f0ae0e3c8a3cd": ethers.BigNumber.from("1277583593999999999999"),
    "0xb42da0d771af70328341f06485a890a4847fad1b": ethers.BigNumber.from("327272727272727272727"),
    "0x98ce445037b7b622293c00289388d90f48a510ec": ethers.BigNumber.from("2181818181818181818181"),
    "0x129da0c07430eb2376de3458d83466a777aa3341": ethers.BigNumber.from("1120144105090909090909"),
    "0x8f11902d6ddd254a1034ac2ff64a42d00a8226b0": ethers.BigNumber.from("1043646662181818181817"),
    "0x0cb29d82f3631b457cf4fd8bb4c616256097c9a4": ethers.BigNumber.from("206492696181818181818"),
    "0x5f6d71cd8404e661cb4736e368564c01a7ff9852": ethers.BigNumber.from("12273484858363636363635"),
    "0x00e0e1be571c62aa8449514575a3705689026ac1": ethers.BigNumber.from("237295752545454545454"),
    "0xfc5723d6bc8da7cadde437fe7cea54219ce97a67": ethers.BigNumber.from("245454545454545454545"),
    "0xf019e72c0f3ea396f09acead38f9aac993067f1c": ethers.BigNumber.from("1793900630454545454545"),
    "0xb5852bafe547e3a14e76e2d2ecb134fea8dd60d9": ethers.BigNumber.from("515502335454545454545"),
    "0x0f4159b74173fe8527b5d61bdac7020584cd2851": ethers.BigNumber.from("327272727272727272727"),
    "0xcd650c9be67dcf3aa10debbefc4e3be1d89f83ca": ethers.BigNumber.from("245445470181818181818"),
    "0xaacf9b34b69269df331e61b6da2149d901ce12f5": ethers.BigNumber.from("4167899995909090909089"),
    "0x752ee85914a87d48fd5945500dde30f83ba63d63": ethers.BigNumber.from("164240653090909090909"),
    "0xa5fb3b980b5a2cd4565661f55ab25da4e7ebb26e": ethers.BigNumber.from("189850846090909090909"),
    "0x7f8bf36e903f0cee894739a1bf5aea4a495747a0": ethers.BigNumber.from("278917575545454545454"),
    "0xad5834a96b8c78a65b4e7a04d5f2b7799c0ce7f8": ethers.BigNumber.from("2414646180000000000000"),
    "0x3d390b56f7fcda9e36802073759bbc0107f68bbe": ethers.BigNumber.from("165935502000000000000"),
    "0x78a24006edb042ad81aa0153b4979b7662f136f9": ethers.BigNumber.from("419086035818181818181"),
    "0x44493d8db718c2636a9670469270397c65d67955": ethers.BigNumber.from("163689940636363636363"),
    "0x49a1a7099be4d4d271b789534d3b74181047259a": ethers.BigNumber.from("165360152454545454545"),
    "0xb99f29bccbcf2ca54193b37a2f98078d59f6783d": ethers.BigNumber.from("163636363636363636363"),
    "0xf2b9918ca2b8275d4ddeb6f7ceb5725fe7e9fe0c": ethers.BigNumber.from("214803571909090909090"),
    "0xbd4ed59887304e8750d22016bf46c7f361c17f44": ethers.BigNumber.from("185391630000000000000"),
    "0x970106514a8ec07017b3f957603eb0994050ed20": ethers.BigNumber.from("5429878262181818181818"),
    "0x9590f358e77ed7065fb2fb8b4f10a8da938203ba": ethers.BigNumber.from("180000000000000000000"),
    "0xcc6db5c95bce616f6a14ab67d0bbbf6d4237f1df": ethers.BigNumber.from("184253438454545454545"),
    "0x46ab107b3632fc7140e7b2294e5d803774eb9c88": ethers.BigNumber.from("291801528818181818181"),
    "0x135907936537a44763817ac7fc30abaec9a81fab": ethers.BigNumber.from("4092154821818181818181"),
    "0x990792f2e3e06fe423cd7209993a176f92ff5681": ethers.BigNumber.from("174152380909090909090")
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
