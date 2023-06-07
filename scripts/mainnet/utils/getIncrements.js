const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus";
const HUNDRED_ETHER_BI = ethers.utils.parseEther("100")

async function main() {
    const firstCP = await getFirstCheckpoint()
    const lastCP = await getLastCheckpoint()

    //priceUSD
    const oldPriceBN = ethers.BigNumber.from(firstCP.priceUSD)
    const newPriceBN = ethers.BigNumber.from(lastCP.priceUSD)
    const priceDif = newPriceBN.sub(oldPriceBN)
    const priceIncrementBN = priceDif.mul(HUNDRED_ETHER_BI).div(oldPriceBN)
    console.log(priceIncrementBN.toString())

    //idem for tvlUSD and (circulatingTUT * priceUSD)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

async function getFirstCheckpoint() {
    const now = parseInt(new Date() / 1000) - 86400
    const query = '{ checkpointHourlies (where:{timestamp_lte:' + now.toString() + '} orderBy:timestamp, orderDirection:desc, first:1) { priceUSD tvlUSD circulatingTUT } }'
    const data = await querySubgraph(query, GRAPH_URL);
    return data.checkpointHourlies[0]
}

async function getLastCheckpoint() {
    const query = '{ checkpointHourlies (orderBy:timestamp, orderDirection:desc, first:1) { priceUSD tvlUSD circulatingTUT } }'
    const data = await querySubgraph(query, GRAPH_URL);
    return data.checkpointHourlies[0]
}

async function querySubgraph(query, url) {
    let response;
    let responseData;

    try {
        response = await fetch(url, {
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