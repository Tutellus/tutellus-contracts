const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const path = require("path");
const filePath = "../../examples/";
const ZERO_BN = ethers.utils.parseEther("0");
const GRAPH_URL = "https://api.thegraph.com/subgraphs/name/tutellus/tutellus";
const HOLDER = "0x02704593f63718a9561137A9131AFcDCE02B6F25"

async function main() {
    const transactions = await getTransactions(HOLDER)
    const agregated = agregateTransactions(transactions)
    const formated = formatAmounts(agregated)
    console.log(formated)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

function agregateTransactions(transactions) {
    return transactions.reduce((acu, transaction) => {
        const amountBN = new ethers.BigNumber.from(transaction.valueTUT)
        const input = transaction.to.id === HOLDER.toLowerCase() ? amountBN : ZERO_BN 
        const output = transaction.from.id === HOLDER.toLowerCase() ? amountBN : ZERO_BN
        acu.input = acu.input.add(input)
        acu.output = acu.output.add(output)
        acu.total = acu.total.add(input).sub(output)
        return acu;
    }, {input: ZERO_BN, output: ZERO_BN, total: ZERO_BN});
}

function formatAmounts(amounts) {
    amounts.input = ethers.utils.formatEther(amounts.input)
    amounts.output = ethers.utils.formatEther(amounts.output)
    amounts.total = ethers.utils.formatEther(amounts.total)
    return amounts;
}

async function getTransactions(holder) {
    let skip = 0
    let query = '{ holder (id:"' + holder.toLowerCase() + '") { transactions (first:1000, skip:' + skip + ', orderBy:timestamp, orderDirection:desc) { hash from { id } to { id } valueTUT timestamp } } }';

    let response = (await querySubgraph(query)).holder.transactions;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ holder (id:"' + holder.toLowerCase() + '") { transactions (first:1000, skip:' + skip + ', orderBy:timestamp, orderDirection:desc) { hash from { id } to { id } valueTUT timestamp } } }';
        loopresponse = (await querySubgraph(query)).holder.transactions;
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
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: query,
            }),
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
