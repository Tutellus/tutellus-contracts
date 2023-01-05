const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const path = require("path");
const ZERO_BN = ethers.utils.parseEther("0");
const ONE_BN = ethers.utils.parseEther("1");
const IDO = "0x620a27a4c628d46cfb398b3169948baa90089dc5";
const jsonPath =
    "../../../examples/mainnet/airdrops/";
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus-launchpad";

const PERCENTAGES = [
    ethers.BigNumber.from(1200),
    ethers.BigNumber.from(900)
]

const RANGES = [
    ethers.utils.parseEther("100000"),
    ethers.utils.parseEther("325000")
]

const TUT_PRICE_USD = ethers.utils.parseEther("0.11")

async function main() {
    const prefundsArray = await getPrefunds();
    let json = processPrefunds(prefundsArray)
    json = stringifyBNInJson(json)
    fs.writeFileSync(
        path.join(__dirname, jsonPath + IDO.toLowerCase() + ".json"),
        JSON.stringify(json, null, 4)
    );
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

function processPrefunds(prefundsArray) {
    let slot = 0
    let percentage = PERCENTAGES[slot]
    let left = RANGES[slot]
    return prefundsArray.reduce((acu, prefund) => {
        const key = prefund.account.account.toLowerCase()
        const prefundBN = convertDecimals6To18(ethers.BigNumber.from(prefund.amount))
        const prefundAmount = prefundBN.lt(left) ? prefundBN : left;
        const leftPrefundAmount = left.lte(prefundBN) ? prefundBN.sub(left) : ZERO_BN
        let amount = prefundAmount.mul(percentage).div(ethers.BigNumber.from(10000))
        left = left.sub(prefundAmount)

        if (!leftPrefundAmount.isZero()) {
            slot++
            percentage = PERCENTAGES[slot]
            left = RANGES[slot].sub(leftPrefundAmount)
            amount = amount.add(leftPrefundAmount.mul(percentage).div(ethers.BigNumber.from(10000)))
        }

        const amountTut = amount.mul(ONE_BN).div(TUT_PRICE_USD)
        acu[key] = acu[key] != undefined ? acu[key].add(amountTut) : amountTut
        return acu;
    }, {})
}

function stringifyBNInJson(json) {
    return Object.entries(json).reduce((acu, [key, value]) => {

        acu[key] = value.toString()
        return acu;
    }, {})
}

async function getPrefunds() {
    let skip = 0;
    let query = '{ prefunds( where: {contract: "' + IDO.toLowerCase() + '", amount_gt: "0"}  first:1000, skip: ' + skip + ' orderBy: timestamp orderDirection: asc ) { account { account } amount } }'
    let response = (await querySubgraph(query)).prefunds;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ prefunds( where: {contract: "' + IDO.toLowerCase() + '", amount_gt: "0"}  first:1000, skip: ' + skip + ' orderBy: timestamp orderDirection: asc ) { account { account } amount } }';
        loopresponse = (await querySubgraph(query)).prefunds;
        response = response.concat(loopresponse);
    }
    return response;
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

function convertDecimals6To18(amountBN) {
    return ethers.utils.parseUnits(amountBN.toString(), 12)
}