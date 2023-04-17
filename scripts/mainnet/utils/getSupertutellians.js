const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const { readFile } = require("fs/promises");
const path = require("path");
const ZERO_BN = ethers.utils.parseEther("0");
const ONE_BN = ethers.utils.parseEther("1");
const jsonPath = "../../../examples/mainnet/";

const GRAPH_URL_LAUNCHPAD =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus-launchpad";
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus";

let RESERVES_TUT, LP_TOTAL_SUPPLY;
const SUPER_LIMIT = ethers.utils.parseEther("15000");

async function main() {
    await getReservesSubgraph()
    const holders = await getHoldersTut()
    const liquidityProviders = await getHoldersLp()
    const stakers = await getStakers()
    const farmers = await getFarmers()
    const stakersLaunchpad = await getStakersLaunchpad()
    const farmersLaunchpad = await getFarmersLaunchpad()

    const obj = holders.reduce((acu, user) => {
        const key = user.id.toLowerCase();

        const tutellian = {
            ...getEmptyValuesObject(),
            token: createBN(user.balanceTUT)
        }

        acu[key] = tutellian
        return acu;
    }, {})

    liquidityProviders.reduce((acu, user) => {
        const key = user.id.toLowerCase();

        const tutellian = (obj[key] == undefined) ? getEmptyValuesObject() : obj[key]
        tutellian.lp = createBN(user.balanceLP)
        acu[key] = tutellian

        return acu;
    }, obj)

    stakers.reduce((acu, user) => {
        const key = user.id.toLowerCase();

        const tutellian = (obj[key] == undefined) ? getEmptyValuesObject() : obj[key]
        tutellian.staking = createBN(user.amountTUT)
        acu[key] = tutellian

        return acu;
    }, obj)

    farmers.reduce((acu, user) => {
        const key = user.id.toLowerCase();

        const tutellian = (obj[key] == undefined) ? getEmptyValuesObject() : obj[key]
        tutellian.farming = transformLpToTut(createBN(user.amountLP))
        acu[key] = tutellian

        return acu;
    }, obj)

    stakersLaunchpad.reduce((acu, user) => {
        const key = user.account.toLowerCase();

        const tutellian = (obj[key] == undefined) ? getEmptyValuesObject() : obj[key]
        tutellian.stakingLaunchpad = createBN(user.amount)
        acu[key] = tutellian

        return acu;
    }, obj)

    farmersLaunchpad.reduce((acu, user) => {
        const key = user.account.toLowerCase();

        const tutellian = (obj[key] == undefined) ? getEmptyValuesObject() : obj[key]
        tutellian.farmingLaunchpad = transformLpToTut(createBN(user.amount))
        acu[key] = tutellian

        return acu;
    }, obj)

    const filteredObj = sumFilterAndFormat(obj)

    fs.writeFileSync(
        path.join(__dirname, jsonPath + "supertutellian.json"),
        JSON.stringify(filteredObj, null, 4)
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

function sumFilterAndFormat(obj) {
    return Object.entries(obj).reduce((acu, [key, user]) => {
        const total = user.token.add(user.lp).add(user.staking).add(user.farming).add(user.stakingLaunchpad).add(user.farmingLaunchpad)

        if (total.gte(SUPER_LIMIT)) {
            acu[key] = {
                ...user,
                token: ethers.utils.formatEther(user.token),
                lp: ethers.utils.formatEther(user.lp),
                staking: ethers.utils.formatEther(user.staking),
                farming: ethers.utils.formatEther(user.farming),
                stakingLaunchpad: ethers.utils.formatEther(user.stakingLaunchpad),
                farmingLaunchpad: ethers.utils.formatEther(user.farmingLaunchpad),
                total: ethers.utils.formatEther(total.toString())
            }
        }

        return acu;
    }, {})
}

async function getHoldersTut() {
    let skip = 0;
    let query = '{ holders(orderBy:balanceTUT, orderDirection:desc, first:1000, skip:' + skip + ', where:{balanceTUT_gt:0}) { id balanceTUT } }'
    let response = (await querySubgraph(query, GRAPH_URL)).holders;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ holders(orderBy:balanceTUT, orderDirection:desc, first:1000, skip:' + skip + ', where:{balanceTUT_gt:0}) { id balanceTUT } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL)).holders;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getHoldersLp() {
    let skip = 0;
    let query = '{ holders(orderBy:balanceLP, orderDirection:desc, first:1000, skip:' + skip + ', where:{balanceLP_gt:0}) { id balanceLP } }'
    let response = (await querySubgraph(query, GRAPH_URL)).holders;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ holders(orderBy:balanceLP, orderDirection:desc, first:1000, skip:' + skip + ', where:{balanceLP_gt:0}) { id balanceLP } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL)).holders;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getStakers() {
    let skip = 0;
    let query = '{ stakers(orderBy:amountTUT, orderDirection:desc, first:1000, skip:' + skip + ', where:{amountTUT_gt:0}) { id amountTUT } }'
    let response = (await querySubgraph(query, GRAPH_URL)).stakers;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ stakers(orderBy:amountTUT, orderDirection:desc, first:1000, skip:' + skip + ', where:{amountTUT_gt:0}) { id amountTUT } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL)).stakers;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getFarmers() {
    let skip = 0;
    let query = '{ farmers(orderBy:amountLP, orderDirection:desc, first:1000, skip:' + skip + ', where:{amountLP_gt:0}) { id amountLP } }'
    let response = (await querySubgraph(query, GRAPH_URL)).farmers;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ farmers(orderBy:amountLP, orderDirection:desc, first:1000, skip:' + skip + ', where:{amountLP_gt:0}) { id amountLP } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL)).farmers;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getStakersLaunchpad() {
    let skip = 0;
    let query = '{ stakers(orderBy:amount, orderDirection:desc, first:1000, skip:' + skip + ', where:{amount_gt:0, type:1}) { account amount } }'
    let response = (await querySubgraph(query, GRAPH_URL_LAUNCHPAD)).stakers;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ stakers(orderBy:amount, orderDirection:desc, first:1000, skip:' + skip + ', where:{amount_gt:0, type:1}) { account amount } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL_LAUNCHPAD)).stakers;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getFarmersLaunchpad() {
    let skip = 0;
    let query = '{ stakers(orderBy:amount, orderDirection:desc, first:1000, skip:' + skip + ', where:{amount_gt:0, type:2}) { account amount } }'
    let response = (await querySubgraph(query, GRAPH_URL_LAUNCHPAD)).stakers;
    let loopresponse = response;
    while (loopresponse.length >= 1000) {
        skip = response.length;
        query = '{ stakers(orderBy:amount, orderDirection:desc, first:1000, skip:' + skip + ', where:{amount_gt:0, type:2}) { account amount } }'
        loopresponse = (await querySubgraph(query, GRAPH_URL_LAUNCHPAD)).stakers;
        response = response.concat(loopresponse);
    }
    return response;
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


function transformLpToTut(lpAmount) {
    const lpShare = lpAmount.mul(ONE_BN).div(LP_TOTAL_SUPPLY);
    return RESERVES_TUT.mul(lpShare).div(ONE_BN);
}

async function getReservesSubgraph() {
    const query = '{ liquidity (id:"0x0000000000000000000000000000000000000000") { liquidityTUT } lptoken (id:"0x5d9ac8993b714df01d079d1b5b0b592e579ca099") { totalSupplyLP } }'
    const data = await querySubgraph(query, GRAPH_URL);
    RESERVES_TUT = ethers.BigNumber.from(data.liquidity.liquidityTUT)
    LP_TOTAL_SUPPLY = ethers.BigNumber.from(data.lptoken.totalSupplyLP)
}

/******** MATH UTILS */

function createBN(amountString) {
    return ethers.BigNumber.from(amountString)
}

const getEmptyValuesObject = () => ({
    token: ZERO_BN,
    lp: ZERO_BN,
    staking: ZERO_BN,
    farming: ZERO_BN,
    stakingLaunchpad: ZERO_BN,
    farmingLaunchpad: ZERO_BN,
    total: ZERO_BN,
});