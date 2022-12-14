const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const { readFile } = require("fs/promises");
const path = require("path");
const ZERO_BN = ethers.utils.parseEther("0");
const ONE_BN = ethers.utils.parseEther("1");
const IDO = "0x620a27a4c628d46cfb398b3169948baa90089dc5";
const IDO_TOKEN_USDT_PRICE = ethers.utils.parseEther("0.1");
const jsonPath =
    "../../../examples/mainnet/launchpad/" + IDO.toLowerCase() + ".json";
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus-launchpad";

async function main() {
    const ido = await getIDO();
    const prefundersArray = await getPrefunders();
    const fundingAmountUsdtBN = ethers.BigNumber.from(ido.fundingAmount);
    const prefundedUsdtBN = ethers.BigNumber.from(ido.prefunded);
    const file = await readFile(path.join(__dirname, jsonPath), "utf8");
    const json = JSON.parse(file);
    const validJson = await verifyJson(
        json,
        prefundersArray,
        prefundedUsdtBN
    );

    console.log("Valid?:", validJson)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

async function verifyJson(json, prefundersArray, fundingAmount) {
    let allocationCounter = ZERO_BN
    let prefundCounter = ZERO_BN

    const jsonLen = Object.keys(json).length
    const arrayLen = prefundersArray.length

    if (jsonLen != arrayLen) return false

    for (let i = 0; i < arrayLen; i++) {
        const prefunder = prefundersArray[i]
        const obj = json[prefunder.account]
        const prefunded = createBN(prefunder.prefunded)
        const allocation = createBN(obj["allocation"])
        const prefund = createBN(obj["prefund"])
        const refund = createBN(obj["refund"])
        const allocatedUsdt = prefund.sub(refund)
        const allocatedToken = transformUsdtToIdoToken(convertDecimals6To18(allocatedUsdt))

        if (!prefunded.eq(prefund)) return false
        if (!allocation.eq(allocatedToken)) return false

        allocationCounter = allocationCounter.add(allocation)
        prefundCounter = prefundCounter.add(prefund)
    }

    if (!prefundCounter.eq(fundingAmount)) return false

    const [prefundTokenBalance, idoTokenBalance] = await getTokenBalances()

    if (!prefundTokenBalance.eq(prefundCounter)) return false
    // if (!idoTokenBalance.eq(allocationCounter)) return false

    return true
}

async function getIDO() {
    let query =
        '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }';
    return (await querySubgraph(query)).ido;
}

async function getPrefunders() {
    let skip = 0;
    let query =
        '{ prefunders (where: {ido:"' +
        IDO.toLowerCase() +
        '", active:true} first:1000, skip:' +
        skip +
        ', orderBy:prefunded, orderDirection:desc) { account prefunded } }';
    let response = (await querySubgraph(query)).prefunders;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query =
            '{ prefunders (where: {ido:"' +
            IDO.toLowerCase() +
            '", active:true} first:1000, skip:' +
            skip +
            ', orderBy:prefunded, orderDirection:desc) { account prefunded } }';
        loopresponse = (await querySubgraph(query)).prefunders;
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

async function getTokenBalances() {
    const ido = await ethers.getContractAt("TutellusIDO", IDO)
    const prefundTokenAddress = await ido.prefundToken()
    const prefundToken = await ethers.getContractAt("ERC20", prefundTokenAddress)
    const idoTokenAddress = await ido.idoToken()
    // const idoToken = await ethers.getContractAt("ERC20", idoTokenAddress)
    const prefundTokenBalance = await prefundToken.balanceOf(IDO)
    const idoTokenBalance = ZERO_BN//await idoToken.balanceOf(IDO)
    return [
        ethers.BigNumber.from(prefundTokenBalance.toString()),
        ethers.BigNumber.from(idoTokenBalance.toString())
    ]
}

/******** MATH UTILS */

function transformUsdtToIdoToken(amountUsdtBN) {
    return amountUsdtBN.mul(ONE_BN).div(IDO_TOKEN_USDT_PRICE);
}

function transformIdoTokenToUsdt(amountIdoBN) {
    return amountIdoBN.mul(IDO_TOKEN_USDT_PRICE).div(ONE_BN);
}

function convertDecimals6To18(amountBN) {
    return ethers.utils.parseUnits(amountBN.toString(), 12)
}

function createBN(amountString) {
    return ethers.BigNumber.from(amountString)
}