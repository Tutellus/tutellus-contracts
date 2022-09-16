const bre = require("hardhat");
const ethers = bre.ethers;
const { create: ipfsHttpClient } = require("ipfs-http-client");
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const { readFile } = require("fs/promises");
const path = require("path");
const { getIdoTree } = require("../../../utils/idoTree");
const ONE_BN = ethers.utils.parseEther("1");
const IDO = "0x540F0d9AF18B43B3dC80E3191f905C5e19F1732B";
const IDO_TOKEN_USDT_PRICE = ethers.utils.parseEther("0.5");
const jsonPath =
    "../../../examples/testnet/launchpad/" + IDO.toLowerCase() + ".json";
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/gperezalba/launchpad-goerli";

const data = {
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https"
};

async function main() {
    const ido = await getIDO();
    const prefunders = await getPrefunders();
    const fundingAmountUsdtBN = ethers.BigNumber.from(ido.fundingAmount);
    const prefundedUsdtBN = ethers.BigNumber.from(ido.prefunded);
    const file = await readFile(path.join(__dirname, jsonPath), "utf8");
    const json = JSON.parse(file);
    const validJson = verifyJson(
        fundingAmountUsdtBN,
        prefundedUsdtBN,
        prefunders,
        json
    );

    if (validJson) {
        try {
            const tree = getIdoTree(json);
            console.log("MerkleRoot: ", tree.toJSON().merkleRoot);
            const uri = await uploadJSON(json, tree.toJSON().merkleRoot)
            console.log("Uri: " + uri);
            const cid = uri.split("https://ipfs.io/ipfs/")[1]
            const ido = await ethers.getContractAt('TutellusIDO', IDO)
            const response = await ido.updateMerkleRoot(tree.toJSON().merkleRoot, cid)
            await response.wait()
            console.log('Success...')
        } catch (error) {
            console.error("ERROR", error);
        }
    } else {
        console.log("Invalid JSON")
    }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

function verifyJson(neededUsdtBN, prefundedUsdtBN, prefunders, json) {
    let sumAllocationIdoBN = ethers.utils.parseEther("0");
    let sumRefundUsdtBN = ethers.utils.parseEther("0");
    let sumAllocationUsdtBN;

    for (let i = 0; i < prefunders.length; i++) {
        sumAllocationIdoBN = sumAllocationIdoBN.add(
            json[prefunders[i].account]["allocation"]
        );
        sumRefundUsdtBN = sumRefundUsdtBN.add(json[prefunders[i].account]["refund"]);

        sumAllocationUsdtBN = transformIdoTokenToUsdt(sumAllocationIdoBN)
    }

    const left = neededUsdtBN.gt(sumAllocationUsdtBN) ? neededUsdtBN.sub(sumAllocationUsdtBN) : sumAllocationUsdtBN.sub(neededUsdtBN)

    return (
        left.lte(ethers.constants.WeiPerEther) && sumAllocationUsdtBN.add(sumRefundUsdtBN).eq(prefundedUsdtBN)
    );
}

async function getIDO() {
    let query =
        '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }';
    return (await querySubgraph(query)).ido;
}

async function getPrefunders() {
    let query =
        '{ prefunders (where: {ido:"' +
        IDO.toLowerCase() +
        '", active:true}, orderBy:prefunded, orderDirection:desc) { account } }';
    return (await querySubgraph(query)).prefunders;
}

async function querySubgraph(query) {
    let response;
    let responseData;

    try {
        response = await fetch(GRAPH_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: query
            })
        });

        if (response.ok) {
            responseData = await response.json();
            return responseData.data;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
    }
}

/******** MATH UTILS */

function transformUsdtToIdoToken(amountUsdtBN) {
    return amountUsdtBN.mul(ONE_BN).div(IDO_TOKEN_USDT_PRICE);
}

function transformIdoTokenToUsdt(amountIdoBN) {
    return amountIdoBN.mul(IDO_TOKEN_USDT_PRICE).div(ONE_BN);
}