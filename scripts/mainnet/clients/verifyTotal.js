const hre = require('hardhat');
const { ethers } = hre;
const { Wallet, provider } = ethers;
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { parseEther, isAddress } = require('ethers/lib/utils');

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

const getTotal = (jsonOld, jsonNew) => {
    const wallets = Object.keys(jsonNew);
    let counter = ethers.BigNumber.from(0)

    wallets.forEach(wallet => {
        if (jsonNew[wallet] !== jsonOld[wallet] || jsonOld[wallet] == undefined) {
            const oldValue = jsonOld[wallet] == undefined ? ethers.BigNumber.from(0) : ethers.BigNumber.from(jsonOld[wallet])
            const newValue = ethers.BigNumber.from(jsonNew[wallet])
            counter = counter.add(newValue.sub(oldValue))
        }
    })
    return counter
}

const URI = "https://ipfs.io/ipfs/QmVEKV6SKiXeqQeLSB3kUiRSoEMGtm15NAy9rHEUrs9hFZ"

const main = async () => {
    const myClientsVault = await ethers.getContractAt('TutellusClientsVaultV2', '0x9E7b780Ebc944260081A443d5703D86DcAef002c');
    console.log('Getting current uri...')
    const uri0 = await myClientsVault.uri();
    console.log(uri0)
    console.log('Downloading old JSON...')
    const json0 = await downloadJSON(uri0);
    console.log('Downloading new JSON...')
    const json1 = await downloadJSON(URI);
    checkWallets(json1);
    console.log(Object.keys(json0).length)
    console.log(Object.keys(json1).length)
    const total = getTotal(json0, json1);
    console.log("Total:", total)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
