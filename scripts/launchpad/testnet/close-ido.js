const bre = require("hardhat");
const ethers = bre.ethers;
const { create: ipfsHttpClient } = require("ipfs-http-client");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const { readFile } = require("fs/promises");
const path = require("path");
const { getIdoTree } = require("../../../utils/idoTree");
const IDO = "0x14092dCA812377a4Be8ADbfA19A164564b1508F5";
const jsonPath =
    "../../../examples/testnet/launchpad/" + IDO.toLowerCase() + ".json";
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/gperezalba/launchpad";

const data = {
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https"
};

async function main() {
    const ido = await getIDO();
    const prefunders = await getPrefunders();
    const fundingAmountBN = ethers.BigNumber.from(ido.fundingAmount);
    const prefundedBN = ethers.BigNumber.from(ido.prefunded);
    const file = await readFile(path.join(__dirname, jsonPath), "utf8");
    const json = JSON.parse(file);
    const validJson = verifyJson(
        fundingAmountBN,
        prefundedBN,
        prefunders,
        json
    );

    if (validJson) {
        try {
            const ipfs = ipfsHttpClient(data);
            const added = await ipfs.add(file);
            console.log("Uri: https://ipfs.io/ipfs/" + added.cid.toString());
            const tree = getIdoTree(json);
            console.log("MerkleRoot: ", tree.toJSON().merkleRoot);
            const ido = await ethers.getContractAt('TutellusIDO', IDO)
            const response = await ido.updateMerkleRoot(tree.toJSON().merkleRoot, added.cid.toString())
            await response.wait()
            console.log('Success...')
        } catch (error) {
            console.error("ERROR", error);
        }
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

function verifyJson(needed, prefunded, prefunders, json) {
    let sumAllocation = ethers.utils.parseEther("0");
    let sumWithdraw = ethers.utils.parseEther("0");

    for (let i = 0; i < prefunders.length; i++) {
        sumAllocation = sumAllocation.add(
            json[prefunders[i].account]["allocation"]
        );
        sumWithdraw = sumWithdraw.add(json[prefunders[i].account]["withdraw"]);
    }

    return (
        /*needed.eq(sumAllocation) && */sumAllocation.add(sumWithdraw).eq(prefunded)
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
        '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balance } } }';
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
