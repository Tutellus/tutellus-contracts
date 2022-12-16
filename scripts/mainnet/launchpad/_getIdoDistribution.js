const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const path = require("path");

const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus-launchpad";
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
const IDO = "0x620a27a4c628d46cfb398b3169948baa90089dc5";
const IDO_TOKEN_USDT_PRICE = ethers.utils.parseEther("0.1");
const USDT_DECIMALS = 6
const ONE_USDT_BN = ethers.utils.parseUnits("1", USDT_DECIMALS);
const PARSE_UNITS = 18 - USDT_DECIMALS
const ONE_WEI_MINUS_USDT_DECIMALS = ethers.utils.parseUnits("1", PARSE_UNITS)
const N_SUPERBOOSTERS = 1;
let N_SUPERBOOSTERS_LEFT = N_SUPERBOOSTERS;
let ONLY_RESULTS = false;
let FORCE_CLOSE_UNDER_OBJETIVE = true;

async function main() {
    await getReserves();
    const ido = await getIDO();
    const fundingAmountBN = ethers.BigNumber.from(ido.fundingAmount);
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
    buildObject(prefunders, stakers);

    // Sort by energy and set ranking and type in JSON object
    const invalidPrefundBN = sortPrefundersByEnergy();

    if (!ONLY_RESULTS) {
        //only if we want to calculate allocations to close IDO

        // Build 3x3 matrix(s) with general amounts
        buildMatrixs(availableToDistributeBN.sub(invalidPrefundBN));

        // Distribute fixed allocation of superboosters and boosters
        distributeAllocationFixed();

        // Distribute lottery allocation of boosters and standards
        distributeAllocationLottery();

        // Distribute left allocation (if any) based in ranking order
        distributeAllocationLeft();
    }

    // Convert BigNumbers to strings and remove unused props
    stringifyBNInJson();

    fs.writeFileSync(
        path.join(__dirname, jsonPath + IDO.toLowerCase() + ".json"),
        JSON.stringify(PREFUNDERS, null, 4)
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

function buildObject(prefundersArray, stakersArray) {
    prefundersArray.forEach(function (prefunder) {
        const key = prefunder.account.toLowerCase();
        PREFUNDERS[key] = getEmptyValuesObject();

        // Set initial values
        PREFUNDERS[key].account = key;
        PREFUNDERS[key].faction = prefunder.faction;
        PREFUNDERS[key].prefund = ethers.BigNumber.from(prefunder.prefunded);
        PREFUNDERS[key].refund = ethers.BigNumber.from(prefunder.prefunded);
        PREFUNDERS[key].account = key;

        // Calculate total energy
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
        PREFUNDERS[key].energy = energyStatic
            .add(energyVariable)
            .add(energyPOAP);

        // Calculate total staked TUT (staking + farming)
        const objs = stakersArray.filter((o) => o.account === key);
        objs.forEach(function (obj) {
            const amountBN = new ethers.BigNumber.from(obj.amount);
            const tutAmount =
                obj.type == 1 ? amountBN : transformLpToTut(amountBN);
            PREFUNDERS[key].staked = PREFUNDERS[key].staked.add(tutAmount);
        });

        const column = FACTIONS[PREFUNDERS[key].faction].ranking;
        PREFUNDERS[key].column = column;
    });
}

function sortPrefundersByEnergy() {
    const sortable = [];
    let invalidPrefund = ZERO_BN

    for (let key in PREFUNDERS) {
        sortable.push(PREFUNDERS[key]);
    }

    sortable.sort(
        (a, b) =>
            parseFloat(b.energy.toString()) - parseFloat(a.energy.toString())
    );

    for (let i = 0; i < sortable.length; i++) {
        const key = sortable[i].account;

        const staked = PREFUNDERS[key].staked;
        PREFUNDERS[key].type = !isStandard(staked)
            ? 3
            : !isBooster(staked)
                ? 2
                : isSuperBooster()
                    ? 0
                    : 1;

        const row = PREFUNDERS[key].type;
        const column = FACTIONS[PREFUNDERS[key].faction].ranking;
        PREFUNDERS[key].row = row;
        PREFUNDERS[key].ranking = i;
        if (row < 3)
            PREFUNDS[row][column] = PREFUNDS[row][column].add(
                PREFUNDERS[key].prefund
            );
        if (row == 1) SUPERTUTELLIAN_LOTTERY[column].push(key);
        if (row == 2) TUTELLIAN_LOTTERY[column].push(key);
        if (PREFUNDERS[key].type == 3) invalidPrefund = invalidPrefund.add(PREFUNDERS[key].prefund)
    }
    return invalidPrefund
}

function buildMatrixs(availableToDistributeBN) {
    TOTAL_ALLOCATION_LEFT = availableToDistributeBN
    for (let i = 0; i < ALLOCATION.length; i++) {
        for (let j = 0; j < ALLOCATION[i].length; j++) {
            TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.add(PREFUNDS[i][j])
            // Calculate available allocation amounts (in USDT) by slot
            ALLOCATION[i][j] = availableToDistributeBN
                .mul(ALLOCATION_PERCENTAGES[i][j])
                .div(HUNDRED_BN);

            // Derivate amount available to lottery by slot
            // Note: forcing ratios to have usdt precision could derive in having a smaller ratio than right one but not a problem

            // Superboosters: 0% lottery, 100% fixed. If slot is overprefunded ratio < 1
            if (i == 0 && !PREFUNDS[i][j].isZero()) {
                RATIOS[i][j] = ALLOCATION[i][j].gte(PREFUNDS[i][j])
                    ? ONE_USDT_BN
                    : ALLOCATION[i][j].mul(ONE_USDT_BN).div(PREFUNDS[i][j]);
            }

            // Boosters: 50% fixed, 50% lottery. If slot is overprefunded ratio < 1, considering 50% of prefunds
            if (i == 1) {
                const half = ALLOCATION[i][j].div(TWO_WEI_BN);
                // Note: maybe 1 decimal position is lost...in that case it goes to allocation and not lottery
                LOTTERY[i][j] = half;
                ALLOCATION[i][j] = ALLOCATION[i][j].sub(LOTTERY[i][j]);

                if (!PREFUNDS[i][j].isZero()) {
                    RATIOS[i][j] = ALLOCATION[i][j].gte(
                        PREFUNDS[i][j].div(TWO_WEI_BN)
                    )
                        ? ONE_USDT_BN
                        : ALLOCATION[i][j].mul(ONE_USDT_BN).div(PREFUNDS[i][j].div(TWO_WEI_BN));
                }
            }

            // Standards: 100% lottery, 0% fixed. Ratio no needed
            if (i == 2) {
                LOTTERY[i][j] = ALLOCATION[i][j];
                ALLOCATION[i][j] = ZERO_BN;
            }
        }
    }
}

function distributeAllocationFixed() {
    for (let key in PREFUNDERS) {
        const prefunder = PREFUNDERS[key];
        const row = prefunder.row;
        const column = prefunder.column;
        if (row < 2) {
            const prefund =
                row == 0
                    ? prefunder.prefund
                    : prefunder.prefund.div(TWO_WEI_BN);
            const allocationUsdt = prefund.mul(RATIOS[row][column]).div(ONE_USDT_BN);
            increasePrefunderAllocation(key, allocationUsdt);
        }
    }
}

function distributeAllocationLottery() {
    for (let i = 0; i < 3; i++) {
        // Note: this could be losing some amount...will be distributed in left amounts
        let availableSupertutellianSlot = PREFUNDS[1][i].div(TWO_WEI_BN);
        while (
            !LOTTERY[1][i].isZero() &&
            !availableSupertutellianSlot.isZero()
        ) {
            const prefunderIndex = randomIntFromInterval(
                0,
                SUPERTUTELLIAN_LOTTERY[i].length - 1
            );
            const key = SUPERTUTELLIAN_LOTTERY[i][prefunderIndex];
            const prefunder = PREFUNDERS[key];
            // Note: LOTTERY[1][i] and availableSupertutellianSlot have usdt precision...so does maxAvailable
            const maxAvailable = availableSupertutellianSlot.gt(LOTTERY[1][i])
                ? LOTTERY[1][i]
                : availableSupertutellianSlot;
            const prefunderAvailable = prefunder.refund;
            const maxAmount = prefunderAvailable.gt(maxAvailable)
                ? maxAvailable
                : prefunderAvailable;
            const amount = maxAmount.lt(ONE_USDT_BN)
                ? parseFloat(ethers.utils.formatUnits(maxAmount, USDT_DECIMALS))
                : randomIntFromInterval(
                    1,
                    parseFloat(ethers.utils.formatUnits(maxAmount, USDT_DECIMALS))
                );
            const amountBN = ethers.utils.parseUnits(amount.toString(), USDT_DECIMALS);
            const removeKeyFromLottery = increasePrefunderLottery(
                key,
                amountBN
            );
            if (removeKeyFromLottery)
                SUPERTUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1);
            LOTTERY[1][i] = LOTTERY[1][i].sub(amountBN);
            availableSupertutellianSlot =
                availableSupertutellianSlot.sub(amountBN);
        }

        let availableTutellianSlot = PREFUNDS[2][i];
        while (!LOTTERY[2][i].isZero() && !availableTutellianSlot.isZero()) {
            const prefunderIndex = randomIntFromInterval(
                0,
                TUTELLIAN_LOTTERY[i].length - 1
            );
            const key = TUTELLIAN_LOTTERY[i][prefunderIndex];
            const prefunder = PREFUNDERS[key];
            const maxAvailable = availableTutellianSlot.gt(LOTTERY[2][i])
                ? LOTTERY[2][i]
                : availableTutellianSlot;
            const prefunderAvailable = prefunder.refund;
            const maxAmount = prefunderAvailable.gt(maxAvailable)
                ? maxAvailable
                : prefunderAvailable;
            const amount = maxAmount.lt(ONE_USDT_BN)
                ? parseFloat(ethers.utils.formatUnits(maxAmount, USDT_DECIMALS))
                : randomIntFromInterval(
                    1,
                    parseFloat(ethers.utils.formatUnits(maxAmount, USDT_DECIMALS))
                );
            const amountBN = ethers.utils.parseUnits(amount.toString(), USDT_DECIMALS);
            const removeKeyFromLottery = increasePrefunderLottery(
                key,
                amountBN
            );
            if (removeKeyFromLottery)
                TUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1);
            LOTTERY[2][i] = LOTTERY[2][i].sub(amountBN);
            availableTutellianSlot = availableTutellianSlot.sub(amountBN);
        }
    }
}

function distributeAllocationLeft() {
    if (TOTAL_PREFUNDS_LEFT.gte(TOTAL_ALLOCATION_LEFT)) {
        // Enough to distribute

        const sortable = [];
        for (let key in PREFUNDERS) {
            sortable.push(PREFUNDERS[key]);
        }
        sortable.sort((a, b) => a.ranking - b.ranking);

        for (let i in sortable) {
            const key = sortable[i].account;
            const prefunder = PREFUNDERS[key];

            if (
                prefunder.refund.gt(ZERO_BN) &&
                TOTAL_ALLOCATION_LEFT.gt(ZERO_BN) &&
                prefunder.row < 3
            ) {
                const extraAmountBN = prefunder.refund.gt(TOTAL_ALLOCATION_LEFT)
                    ? TOTAL_ALLOCATION_LEFT
                    : prefunder.refund;
                increasePrefunderLeft(key, extraAmountBN);
            }
        }
    } else {
        // Not enough to distribute
        throw new Error(
            "Not enough prefund available to distribute allocation left"
        );
    }
}

function stringifyBNInJson() {
    for (let key in PREFUNDERS) {
        PREFUNDERS[key].energy = PREFUNDERS[key].energy.toString();
        PREFUNDERS[key].allocation = PREFUNDERS[key].allocation.toString();
        PREFUNDERS[key].prefund = PREFUNDERS[key].prefund.toString()
        PREFUNDERS[key].lottery = PREFUNDERS[key].lottery.toString()
        PREFUNDERS[key].refund = PREFUNDERS[key].refund.toString()
        PREFUNDERS[key].left = PREFUNDERS[key].left.toString()
        PREFUNDERS[key].staked = PREFUNDERS[key].staked.toString();

        delete PREFUNDERS[key].row;
        delete PREFUNDERS[key].column;
    }
}

/******** UTILS */

function increasePrefunderLeft(key, amountBN) {
    increasePrefunderAllocation(key, amountBN);
    PREFUNDERS[key].left = PREFUNDERS[key].left.add(amountBN);
}

function increasePrefunderLottery(key, amountBN) {
    increasePrefunderAllocation(key, amountBN);
    PREFUNDERS[key].lottery = PREFUNDERS[key].lottery.add(amountBN);
    return PREFUNDERS[key].refund.isZero();
}

function increasePrefunderAllocation(key, amountBN) {
    PREFUNDERS[key].refund = PREFUNDERS[key].refund.sub(amountBN);
    PREFUNDERS[key].allocation = PREFUNDERS[key].allocation.add(
        transformUsdtToIdoToken(amountBN)
    );
    TOTAL_ALLOCATION = TOTAL_ALLOCATION.add(amountBN);
    TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.sub(amountBN);
    TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.sub(amountBN)
}

function getEmptyValuesObject() {
    const object = new Object();
    object.account = ethers.constants.AddressZero;
    object.ranking = -1;
    object.type = -1;
    object.faction = ethers.constants.HashZero;
    object.energy = ZERO_BN;
    object.allocation = ZERO_BN;
    object.prefund = ZERO_BN;
    object.lottery = ZERO_BN;
    object.refund = ZERO_BN;
    object.left = ZERO_BN;
    object.staked = ZERO_BN;
    object.row = -1;
    object.column = -1;
    return object;
}

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

function unscaleEnergyVariable(amount) {
    return rayMul(amount, getNormalization());
}

function getNormalization() {
    const timestamp = mathObj.lastUpdateTimestamp;
    if (timestamp.eq(mathObj.blockTimestamp)) return mathObj.normalization;
    let result = calculateLinearInterest(timestamp);
    return rayMul(result, mathObj.normalization);
}

function convertToUsdtPrecision(weiAmountBN) {
    return weiAmountBN.div(ONE_WEI_MINUS_USDT_DECIMALS).mul(ONE_WEI_MINUS_USDT_DECIMALS)
}

function convertDecimals18To6(amountBN) {
    return ethers.utils.parseUnits(ethers.utils.formatEther(amountBN.toString()).toString(), 6)
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

function isBooster(tutAmount) {
    return BOOSTER_LIMIT_BN.lte(tutAmount);
}

function isStandard(tutAmount) {
    return STANDARD_LIMIT_BN.lte(tutAmount);
}

function isSuperBooster() {
    if (!(N_SUPERBOOSTERS_LEFT > 0)) return false;
    N_SUPERBOOSTERS_LEFT--;
    return true;
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
        ") { account type contract amount } }";
    let response = (await querySubgraph(query)).stakers;
    let loopresponse = response;

    while (loopresponse.length >= 1000) {
        skip = response.length;
        query =
            "{ stakers (where: {account_in:[" +
            array +
            "], amount_gt:0}, first:1000, skip:" +
            skip +
            ") { account type contract amount } }";
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
        ', orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"' +
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
            ', orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"' +
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
        '"}, orderBy:"energy", orderDirection:desc) { energy faction { id } } }';
    return await querySubgraph(query);
}

async function getIDO() {
    let query =
        '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }';
    return (await querySubgraph(query)).ido;
}

async function setMathObj() {
    let query =
        '{ energy (id:"' +
        ENERGY_ADDR.toLowerCase() +
        '") { lastUpdateTimestamp rate normalization } }';
    let obj = (await querySubgraph(query)).energy;
    mathObj.rate = ethers.BigNumber.from(obj.rate);
    mathObj.normalization = ethers.BigNumber.from(obj.normalization);
    mathObj.lastUpdateTimestamp = ethers.BigNumber.from(
        obj.lastUpdateTimestamp
    );
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

const PREFUNDERS = new Object();
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

const PREFUNDS = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
];

const ALLOCATION = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
];

const LOTTERY = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
];

const RATIOS = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
];

let TOTAL_ALLOCATION_LEFT = ZERO_BN;
let TOTAL_ALLOCATION = ZERO_BN;
let TOTAL_PREFUNDS_LEFT = ZERO_BN;

const SUPERTUTELLIAN_LOTTERY = [[], [], []];
const TUTELLIAN_LOTTERY = [[], [], []];
