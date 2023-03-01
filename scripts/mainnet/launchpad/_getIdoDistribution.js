const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const path = require("path");

const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus-launchpad";
const GRAPH_URL_TUTELLUS =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus";
const ZERO_BN = ethers.utils.parseEther("0");
const ONE_BN = ethers.utils.parseEther("1");
const TWO_WEI_BN = ethers.BigNumber.from("2");
const HUNDRED_BN = ethers.utils.parseEther("100");
const STANDARD_LIMIT_BN = ethers.utils.parseEther("1000");
const BOOSTER_LIMIT_BN = ethers.utils.parseEther("20000");
const VUTERINS_FACTION = ethers.utils.id("VUTERINS_FACTION");
const NAKAMOTOS_FACTION = ethers.utils.id("NAKAMOTOS_FACTION");
const ALTCOINERS_FACTION = ethers.utils.id("ALTCOINERS_FACTION");
const LP_TOKEN = "0x5d9ac8993b714df01d079d1b5b0b592e579ca099";
const ENERGY_ADDR = "0x11Ee530F8C67320Fb068D85f546166793c16c3c7";
const jsonPath = "../../../examples/mainnet/launchpad/";
let RESERVES_TUT, LP_TOTAL_SUPPLY;

// VARIABLE INPUTS
const POAP_ID =
    "0x4b9a1717123cccffca21391e077dbc337a0ab212ec8bbaaa2ab1b0c242eba4ea";
const IDO = "0xb2d987f2a5fe094ef1c7377287481db4ecdaa05b";
const IDO_TOKEN_USDT_PRICE = ethers.utils.parseEther("0.12");
const USDT_DECIMALS = 6
const ONE_USDT_BN = ethers.utils.parseUnits("1", USDT_DECIMALS);
const PARSE_UNITS = 18 - USDT_DECIMALS
const ONE_WEI_MINUS_USDT_DECIMALS = ethers.utils.parseUnits("1", PARSE_UNITS)
const N_SUPERBOOSTERS = 10;
let FORCE_CLOSE_UNDER_OBJETIVE = true;
const BLOCK_NUMBER = 39627347
const OBJETIVE_USDT = ethers.utils.parseUnits("100000", USDT_DECIMALS);

async function main() {
    await getReservesSubgraph(BLOCK_NUMBER);
    const ido = await getIDO();
    const fundingAmountBN = OBJETIVE_USDT;
    const prefundedBN = ethers.BigNumber.from(ido.prefunded);
    const availableToDistributeBN = (fundingAmountBN.gt(prefundedBN) && FORCE_CLOSE_UNDER_OBJETIVE) ? prefundedBN : fundingAmountBN

    // Initialize object used to unscale energy
    await setMathObj();

    // Set ranking of factions based on energy (considering only energy of prefunders)
    await setWinnerFaction();

    // Get array of IDO's prefunders
    const prefunders = await getPrefunders();

    // Get array with deposits (staking and farming) of prefunders
    const stakers = await getStakers(prefunders);

    // Initialize JSON object with know props
    const investors = buildObject(prefunders, stakers, FACTIONS)

    // Sort by energy and set ranking and type in JSON object
    const sorted = sortInverstors(investors, N_SUPERBOOSTERS)

    // Prefunders without faction
    const invalidPrefundBN = getInvalidPrefund(sorted)
    const validPrefundBN = availableToDistributeBN.sub(invalidPrefundBN)

    // Ponderation per slot
    const ratios = getRatios(sorted, ALLOCATION_PERCENTAGES, validPrefundBN)

    // Distribute fixed allocation of superboosters and boosters
    const [investorsFixed, allocationLeftBN1] = distributeAllocationFixed(sorted, validPrefundBN, ratios)

    // Distribute lottery allocation of boosters and standards
    const [investorsLottery, allocationLeftBN2] = distributeAllocationLottery(investorsFixed, validPrefundBN, allocationLeftBN1, ALLOCATION_PERCENTAGES)

    // Distribute left allocation (if any) based in ranking order
    const investorsFinal = distributeAllocationLeft(investorsLottery, allocationLeftBN2)

    // Set final allocation based in prefund - refund
    const investorsPrecise = setAllocation(investorsFinal);

    // Convert BigNumbers to strings and remove unused props
    const investorsString = stringifyBNInJson(investorsPrecise);

    fs.writeFileSync(
        path.join(__dirname, jsonPath + IDO.toLowerCase() + ".json"),
        JSON.stringify(investorsString, null, 4)
    );
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

/******** CORE */

// we assume energy of prefunders type=user is valid
async function setWinnerFaction() {
    const factions = (await getSubgraphDataByIdo()).factionByIDOs;

    // factions array is already in desc order
    for (let i = 0; i < factions.length; i++) {
        const key = factions[i].faction.id;
        FACTIONS[key].ranking = i;
        FACTIONS[key].energy = unscaleEnergyVariable(
            ethers.BigNumber.from(factions[i].energy)
        );
    }

    // in case a faction is empty
    let ranking = 2;
    for (let faction in FACTIONS) {
        if (FACTIONS[faction].ranking == -1) {
            FACTIONS[faction].ranking = ranking;
            ranking--;
        }
    }
}

function buildObject(prefundersArray, stakersArray, factionsRanking) {
    const getRanking = (faction) => factionsRanking[faction].ranking;

    return prefundersArray.reduce((acu, prefunder) => {
        const key = prefunder.account.toLowerCase();
        const stakingInfo = stakersArray.filter((o) => o.account === key);

        const investor = {
            ...getEmptyValuesObject(),
            account: key,
            faction: prefunder.faction,
            prefund: ethers.BigNumber.from(prefunder.prefunded),
            refund: ethers.BigNumber.from(prefunder.prefunded),
            energy: calculateEnergy(prefunder),
            staked: calculateStacked(stakingInfo),
            column: getRanking(prefunder.faction)
        }

        acu[key] = investor;

        return acu;
    }, {})
}

function rankByEnergy(investors) {
    const sortable = Object.keys(investors).map((key) => investors[key]);
    sortable.sort(
        (a, b) => parseFloat(b.energy.toString()) - parseFloat(a.energy.toString()),
    );
    return sortable.map(((item, index) => ({
        ...item,
        ranking: index,
    })));
}

function sortInverstors(investors, numBoosters) {
    const sorted = rankByEnergy(investors);

    let topLeft = numBoosters;
    const ranked = sorted.map((item) => {
        let type = 3;
        let isBooster = false;
        if (isSuperVenture(item.staked)) {
            if (topLeft > 0) {
                topLeft--;
                isBooster = true;
                type = 0
            } else {
                type = 1
            }
        } else if (isVenture(item.staked)) {
            type = 2;
        }

        return {
            ...item,
            isBooster,
            type,
            row: type
        };
    });

    return ranked.reduce((acu, item) => {
        acu[item.account] = item;
        return acu;
    }, {});
}

function getInvalidPrefund(investors) {
    return Object.values(investors).reduce((acu, investor) => {
        const prefund = (investor.type === 3) ? investor.prefund : ZERO_BN
        return acu.add(prefund)
    }, ZERO_BN)
}

function getSlotPrefunds(investors, row, column) {
    return Object.values(investors).reduce((acu, investor) => {
        const prefund = (investor.row === row && investor.column === column) ? investor.prefund : ZERO_BN
        return acu.add(prefund)
    }, ZERO_BN)
}

function getRatios(investors, percentagesMatrix, totalAllocationBN) {
    const ratiosMatrix = []
    for (let i = 0; i < percentagesMatrix.length; i++) {
        ratiosMatrix.push([])
        for (let j = 0; j < percentagesMatrix[i].length; j++) {
            const slotPrefund = getSlotPrefunds(investors, i, j)
            const slotAllocation = totalAllocationBN.mul(percentagesMatrix[i][j]).div(HUNDRED_BN)
            const ratio = slotAllocation.gte(slotPrefund) ? ONE_USDT_BN : slotAllocation.mul(ONE_USDT_BN).div(slotPrefund)
            ratiosMatrix[i].push(ratio)
        }
    }
    return ratiosMatrix
}

function distributeAllocationFixed(investors, totalAllocationBN, ratiosMatrix) {
    let allocationLeftBN = totalAllocationBN
    return [Object.values(investors).map((item) => {
        let allocation = ZERO_BN
        let allocatedUsdt = ZERO_BN
        if (item.row < 2) {
            allocatedUsdt = item.prefund.mul(ratiosMatrix[item.row][item.column]).div(ONE_USDT_BN)
            if (item.row == 1) {
                allocatedUsdt = allocatedUsdt.div(TWO_WEI_BN)
            }
            allocationLeftBN = allocationLeftBN.sub(allocatedUsdt)
        }

        return {
            ...item,
            refund: item.refund.sub(allocatedUsdt)
        }
    }).reduce((acu, item) => {
        acu[item.account] = item;
        return acu;
    }, {}), allocationLeftBN]
}

function distributeAllocationLottery(investors, totalAllocationBN, allocationLeftBN, percentagesMatrix) {
    for (let i = 1; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const array = Object.values(investors).filter((investor) => (investor.row === i && investor.column === j))
            let lotteryLeftBN = totalAllocationBN.mul(percentagesMatrix[i][j]).div(HUNDRED_BN)
            if (i == 1) lotteryLeftBN = lotteryLeftBN.div(TWO_WEI_BN)

            while (!lotteryLeftBN.isZero() && array.length > 0) {
                const index = randomIntFromInterval(0, array.length - 1)
                const investor = investors[array[index].account]
                const minLotteryInvestor = investor.refund.gt(lotteryLeftBN) ? lotteryLeftBN : investor.refund
                const lotteryAmount = minLotteryInvestor.lt(ONE_USDT_BN)
                    ? parseFloat(ethers.utils.formatUnits(minLotteryInvestor, USDT_DECIMALS))
                    : randomIntFromInterval(
                        1,
                        parseFloat(ethers.utils.formatUnits(minLotteryInvestor, USDT_DECIMALS))
                    );
                const lotteryAmountBN = ethers.utils.parseUnits(lotteryAmount.toString(), USDT_DECIMALS);
                investor.refund = investor.refund.sub(lotteryAmountBN)
                investor.lottery = investor.lottery.add(lotteryAmountBN)

                if (investor.refund.isZero()) array.splice(index, 1)
                lotteryLeftBN = lotteryLeftBN.sub(lotteryAmountBN)
                allocationLeftBN = allocationLeftBN.sub(lotteryAmountBN)
            }
        }
    }
    return [investors, allocationLeftBN]
}

function distributeAllocationLeft(investors, allocationLeftBN) {
    const array = Object.keys(investors).map((key) => investors[key]);
    array.sort(
        (a, b) => parseFloat(a.ranking) - parseFloat(b.ranking),
    );

    let index = 0;
    while (!allocationLeftBN.isZero() && index < array.length) {
        const investor = investors[array[index].account]
        index++
        if (investor.row < 3) {
            const leftAmountUsdtBN = investor.refund.gt(allocationLeftBN) ? allocationLeftBN : investor.refund;
            allocationLeftBN = allocationLeftBN.sub(leftAmountUsdtBN)
            investor.refund = investor.refund.sub(leftAmountUsdtBN)
            investor.left = investor.left.add(leftAmountUsdtBN)
        }
    }
    return investors;
}

function setAllocation(investors) {
    return Object.entries(investors).reduce((acu, [key, investor]) => {

        acu[key] = {
            ...investor,
            allocation: transformUsdtToIdoToken(investor.prefund.sub(investor.refund)),
        }
        return acu;
    }, {})
}

function stringifyBNInJson(investors) {
    return Object.entries(investors).reduce((acu, [key, investor]) => {

        acu[key] = {
            ...investor,
            energy: investor.energy.toString(),
            allocation: investor.allocation.toString(),
            prefund: investor.prefund.toString(),
            lottery: investor.lottery.toString(),
            refund: investor.refund.toString(),
            left: investor.left.toString(),
            staked: investor.staked.toString(),

            row: undefined,
            column: undefined,
        }
        return acu;
    }, {})
}

/******** UTILS */

const getEmptyValuesObject = () => ({
    account: ethers.constants.AddressZero,
    isBooster: false,
    ranking: -1,
    type: -1,
    faction: ethers.constants.HashZero,
    energy: ZERO_BN,
    allocation: ZERO_BN,
    prefund: ZERO_BN,
    lottery: ZERO_BN,
    refund: ZERO_BN,
    left: ZERO_BN,
    staked: ZERO_BN,
    row: -1,
    column: -1,
});

/******** MATH UTILS */

function transformUsdtToIdoToken(amountUsdtBN) {
    return amountUsdtBN.mul(ONE_BN).mul(ONE_BN).div(IDO_TOKEN_USDT_PRICE).div(ONE_USDT_BN);
}

function transformLpToTut(lpAmount) {
    const lpShare = lpAmount.mul(ONE_BN).div(LP_TOTAL_SUPPLY);
    return RESERVES_TUT.mul(lpShare).div(ONE_BN);
}

async function getReserves() {
    const contract = await ethers.getContractAt("IUniswapV2Pair", LP_TOKEN);
    const reserves = await contract.getReserves();
    RESERVES_TUT = new ethers.BigNumber.from(reserves.reserve0);
    LP_TOTAL_SUPPLY = await contract.totalSupply();
}

async function getReservesSubgraph(blockNumber) {
    const query = '{ liquidity (id:"0x0000000000000000000000000000000000000000", block:{number:' + blockNumber.toString() + '}) { liquidityTUT } lptoken (id:"0x5d9ac8993b714df01d079d1b5b0b592e579ca099", block:{number:' + blockNumber.toString() + '}) { totalSupplyLP } }'
    const data = await querySubgraphTutellus(query);
    RESERVES_TUT = ethers.BigNumber.from(data.liquidity.liquidityTUT)
    LP_TOTAL_SUPPLY = ethers.BigNumber.from(data.lptoken.totalSupplyLP)
}

function calculateEnergy(prefunder) {
    const energyStatic = ethers.BigNumber.from(
        prefunder.energyHolder.balanceStatic
    );
    const energyVariable = unscaleEnergyVariable(
        ethers.BigNumber.from(prefunder.energyHolder.balanceVariable)
    );
    const energyPOAP =
        prefunder.energyHolder.poaps.length > 0
            ? ethers.BigNumber.from(prefunder.energyHolder.poaps[0].balanceEnergy)
            : ethers.BigNumber.from("0");
    return energyStatic.add(energyVariable).add(energyPOAP)
}

function calculateStacked(stakingInfo) {
    return stakingInfo.reduce((acu, info) => {
        const amountBN = new ethers.BigNumber.from(info.amount);
        const tutAmount = info.type === 1 ? amountBN : transformLpToTut(amountBN);
        return acu.add(tutAmount);
    }, ZERO_BN);
}

function unscaleEnergyVariable(amount) {
    return rayMul(amount, getNormalization());
}

function getNormalization() {
    const timestamp = mathObj.lastUpdateTimestamp;
    if (timestamp.eq(mathObj.blockTimestamp)) return mathObj.normalization;
    let result = calculateLinearInterest(timestamp);
    return rayMul(result, mathObj.normalization);
}

function rayMul(a, b) {
    if (a == 0 || b == 0) return 0;
    return a.mul(b).add(mathObj.halfRAY).div(mathObj.ray);
}

function calculateLinearInterest(lastUpdateTimestamp) {
    const timeDifference = mathObj.blockTimestamp.sub(lastUpdateTimestamp);
    return mathObj.rate
        .mul(timeDifference)
        .div(mathObj.secondsPerYear)
        .add(mathObj.ray);
}

function isSuperVenture(tutAmount) {
    return BOOSTER_LIMIT_BN.lte(tutAmount);
}

function isVenture(tutAmount) {
    return STANDARD_LIMIT_BN.lte(tutAmount);
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

/******** SUBGRAPH */

async function getStakers(prefunders) {
    let array = '"';
    for (let i = 0; i < prefunders.length - 1; i++) {
        array = array
            .concat(prefunders[i].account.toLowerCase())
            .concat('", "');
    }
    array = array
        .concat(prefunders[prefunders.length - 1].account.toLowerCase())
        .concat('"');
    let skip = 0;
    let query =
        "{ stakers (where: {account_in:[" +
        array +
        "], amount_gt:0}, first:1000, skip:" +
        skip +
        ", block:{number:" + BLOCK_NUMBER.toString() + "}) { account type contract amount } }";
    let response = (await querySubgraph(query)).stakers;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query =
            "{ stakers (where: {account_in:[" +
            array +
            "], amount_gt:0}, first:1000, skip:" +
            skip +
            ", block:{number:" + BLOCK_NUMBER.toString() + "}) { account type contract amount } }";
        loopresponse = (await querySubgraph(query)).stakers;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getPrefunders() {
    let skip = 0;
    let query =
        '{ prefunders (where: {ido:"' +
        IDO.toLowerCase() +
        '", active:true} first:1000, skip:' +
        skip +
        ', orderBy:prefunded, orderDirection:desc, block:{number:' + BLOCK_NUMBER.toString() + '}) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"' +
        POAP_ID.toLowerCase() +
        '"}) { balanceEnergy } } } }';
    let response = (await querySubgraph(query)).prefunders;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query =
            '{ prefunders (where: {ido:"' +
            IDO.toLowerCase() +
            '", active:true} first:1000, skip:' +
            skip +
            ', orderBy:prefunded, orderDirection:desc, block:{number:' + BLOCK_NUMBER.toString() + '}) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"' +
            POAP_ID.toLowerCase() +
            '"}) { balanceEnergy } } } }';
        loopresponse = (await querySubgraph(query)).prefunders;
        response = response.concat(loopresponse);
    }
    return response;
}

async function getSubgraphDataByIdo() {
    let query =
        '{ factionByIDOs (where:{ido:"' +
        IDO.toLowerCase() +
        '"}, orderBy:"energy", orderDirection:desc, block:{number:' + BLOCK_NUMBER.toString() + '}) { energy faction { id } } }';
    return await querySubgraph(query);
}

async function getIDO() {
    let query =
        '{ ido (id:"' + IDO.toLowerCase() + '", block:{number:' + BLOCK_NUMBER.toString() + '}) { fundingAmount prefunded } }';
    return (await querySubgraph(query)).ido;
}

async function setMathObj() {
    let query =
        '{ energy (id:"' +
        ENERGY_ADDR.toLowerCase() +
        '", block:{number:' + BLOCK_NUMBER.toString() + '}) { lastUpdateTimestamp rate normalization } }';
    let obj = (await querySubgraph(query)).energy;
    mathObj.rate = ethers.BigNumber.from(obj.rate);
    mathObj.normalization = ethers.BigNumber.from(obj.normalization);
    mathObj.lastUpdateTimestamp = ethers.BigNumber.from(
        obj.lastUpdateTimestamp
    );
    const blockTimestamp = await getBlockTimestamp(BLOCK_NUMBER)
    mathObj.blockTimestamp = ethers.BigNumber.from(blockTimestamp.toString())
}

async function getBlockTimestamp(blockNumber) {
    const block = await ethers.provider.getBlock(blockNumber)
    return block.timestamp;
}

async function querySubgraph(query) {
    return await querySubgraphUrl(query, GRAPH_URL)
}

async function querySubgraphTutellus(query) {
    return await querySubgraphUrl(query, GRAPH_URL_TUTELLUS)
}

async function querySubgraphUrl(query, url) {
    let response;
    let responseData;

    try {
        response = await fetch(url, {
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

/******** CONSTS */

const mathObj = {
    blockTimestamp: ethers.BigNumber.from(
        parseInt(Date.now() / 1000).toString()
    ),
    lastUpdateTimestamp: 0,
    rate: 0,
    secondsPerYear: ethers.BigNumber.from("31536000"),
    ray: ethers.BigNumber.from("1000000000000000000000000000"),
    normalization: 0,
    halfRAY: ethers.BigNumber.from("500000000000000000000000000"),
};

const FACTIONS = new Object();
FACTIONS[NAKAMOTOS_FACTION] = { energy: ZERO_BN, ranking: -1 };
FACTIONS[VUTERINS_FACTION] = { energy: ZERO_BN, ranking: -1 };
FACTIONS[ALTCOINERS_FACTION] = { energy: ZERO_BN, ranking: -1 };

const ALLOCATION_PERCENTAGES = [
    [
        ethers.utils.parseEther("20"),
        ethers.utils.parseEther("14"),
        ethers.utils.parseEther("11"),
    ],
    [
        ethers.utils.parseEther("13"),
        ethers.utils.parseEther("8"),
        ethers.utils.parseEther("7"),
    ],
    [
        ethers.utils.parseEther("12"),
        ethers.utils.parseEther("8"),
        ethers.utils.parseEther("7"),
    ],
];