const { ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad'
const ZERO_BN = ethers.utils.parseEther('0')
const ONE_BN = ethers.utils.parseEther('1')
const HUNDRED_BN = ethers.utils.parseEther('100')
const SUPERTUTELLIAN_LIMIT_BN = ethers.utils.parseEther('1500')
const N_TOPS = 1
let N_TOPS_LEFT = N_TOPS
const IDO = '0x01F8779256d144B218E7E93439044CFDDa02830c'

const FACTION_TO_RANKING = {
    '0x07c5159843a958fc71baf890fe7145df06430f1ad3c3c8511dd37924fc4f08a8': -1,
    '0x72f929da653bc165dcca2c0b934092fec6fa3a17347ffce347de5cea411a9abc': -1,
    '0x0e81077977837f8edfe8400a2d3179a5cd6638e46487625a742c2f8dc9f53ce4': -1
}

const ALLOCATION_PERCENTAGES = [
    [ethers.utils.parseEther('20'), ethers.utils.parseEther('14'), ethers.utils.parseEther('11')],
    [ethers.utils.parseEther('13'), ethers.utils.parseEther('8'), ethers.utils.parseEther('7')],
    [ethers.utils.parseEther('12'), ethers.utils.parseEther('8'), ethers.utils.parseEther('7')]
]
const PREFUNDS = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const ALLOCATION = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const ALLOCATION_RAW = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const LOTTERY = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const ALLOCATION_LEFT = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

let TOTAL_ALLOCATION_LEFT = ZERO_BN

const PREFUNDS_LEFT = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const RATIOS = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

let TOTAL_PREFUNDS_LEFT = ZERO_BN

let MIN_INDEX_LOTTERY_SUPERTUTELLIAN = 0
let MAX_INDEX_LOTTERY_SUPERTUTELLIAN = 0
let MIN_INDEX_LOTTERY_TUTELLIAN = 0
let MAX_INDEX_LOTTERY_TUTELLIAN = 0

async function main() {
    const ido = await getIDO()
    const fundingAmountBN = ethers.BigNumber.from(ido.fundingAmount)
    const prefundedBN = ethers.BigNumber.from(ido.prefunded)

    if (fundingAmountBN.gt(prefundedBN)) {
        console.log('Funding is over prefunded amount')
    } else {

        // Get all IDO prefunders by IDO
        let prefunders = await getPrefunders()

        // Calculate factions ranking
        await setWinnerFaction(prefunders)

        // Sort prefunders by factions (and by energy inside factions)
        prefunders = await sortPrefunders(prefunders)

        // Classify prefunders in slots (and calc total prefund by slot)
        const prefundersArray = classifyPrefunders(prefunders)

        // Calculate aggregated amounts of slots
        calculateSlotTotals(fundingAmountBN)

        lotteryDraw(prefundersArray)

        // Calculate amounts of each prefunder
        const [distribution, withdraw] = computeDistribution(prefundersArray)

        console.log(ethers.utils.formatEther(ALLOCATION[0][0]), '  ', ethers.utils.formatEther(ALLOCATION[0][1]), '  ', ethers.utils.formatEther(ALLOCATION[0][2]), '  ')
        console.log(ethers.utils.formatEther(ALLOCATION[1][0]), '  ', ethers.utils.formatEther(ALLOCATION[1][1]), '  ', ethers.utils.formatEther(ALLOCATION[1][2]), '  ')
        console.log(ethers.utils.formatEther(ALLOCATION[2][0]), '  ', ethers.utils.formatEther(ALLOCATION[2][1]), '  ', ethers.utils.formatEther(ALLOCATION[2][2]), '  ')
        console.log('-----')
        console.log(ethers.utils.formatEther(PREFUNDS[0][0]), '  ', ethers.utils.formatEther(PREFUNDS[0][1]), '  ', ethers.utils.formatEther(PREFUNDS[0][2]), '  ')
        console.log(ethers.utils.formatEther(PREFUNDS[1][0]), '  ', ethers.utils.formatEther(PREFUNDS[1][1]), '  ', ethers.utils.formatEther(PREFUNDS[1][2]), '  ')
        console.log(ethers.utils.formatEther(PREFUNDS[2][0]), '  ', ethers.utils.formatEther(PREFUNDS[2][1]), '  ', ethers.utils.formatEther(PREFUNDS[2][2]), '  ')
        console.log(distribution)
        console.log(withdraw)
        for (let i = 0; i < prefundersArray.length; i++) {
            console.log(prefundersArray[i].account)
            console.log(ethers.utils.formatEther(prefundersArray[i].prefunded))
            console.log(ethers.utils.formatEther(prefundersArray[i].allocated))
            console.log(ethers.utils.formatEther(prefundersArray[i].lottery))
        }
    }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })

function classifyPrefunders(prefunders) {
    let prefunder, column
    const prefundersArray = []
    for (let i = 0; i < prefunders.length; i++) {
        prefunder = prefunders[i]
        column = FACTION_TO_RANKING[prefunder.faction]
        let obj = new Object()
        obj.account = prefunder.account
        obj.faction = prefunder.faction
        obj.prefunded = ethers.BigNumber.from(prefunder.prefunded)
        obj.allocated = ZERO_BN
        obj.lottery = ZERO_BN
        obj.left = ethers.BigNumber.from(prefunder.prefunded)
        obj.column = column

        if (isSupertutellian(prefunder)) {
            if (isTop()) {
                PREFUNDS[0][column] = PREFUNDS[0][column].add(prefunder.prefunded)
                obj.row = 0
            } else {
                PREFUNDS[1][column] = PREFUNDS[1][column].add(prefunder.prefunded)
                obj.row = 1
                if (MIN_INDEX_LOTTERY_SUPERTUTELLIAN == 0) MIN_INDEX_LOTTERY_SUPERTUTELLIAN = i
            }
        } else {
            if (MAX_INDEX_LOTTERY_SUPERTUTELLIAN == 0) {
                MAX_INDEX_LOTTERY_SUPERTUTELLIAN = i - 1
                MIN_INDEX_LOTTERY_TUTELLIAN = i
                MAX_INDEX_LOTTERY_TUTELLIAN = prefunders.length - 1
            }
            if (isWinner(prefunder)) {
                PREFUNDS[2][column] = PREFUNDS[2][column].add(prefunder.prefunded)
                obj.row = 2
            } else {
                obj.allocated = ZERO_BN
            }
        }

        prefundersArray.push(obj)
    }

    return prefundersArray
}

function calculateSlotTotals(fundingAmountBN) {
    for (let i = 0; i < ALLOCATION.length; i++) {
        for (let j = 0; j < ALLOCATION[i].length; j++) {
            // Calculate available amounts (in USDT) by slot
            ALLOCATION[i][j] = fundingAmountBN.mul(ALLOCATION_PERCENTAGES[i][j]).div(HUNDRED_BN)
            ALLOCATION_RAW[i][j] = fundingAmountBN.mul(ALLOCATION_PERCENTAGES[i][j]).div(HUNDRED_BN)

            // Derivate amount available to lottery by slot
            if (i == 1) {
                LOTTERY[i][j] = ALLOCATION[i][j].div(ethers.BigNumber.from('2'))
                ALLOCATION[i][j] = ALLOCATION[i][j].sub(LOTTERY[i][j])
            }

            if (i == 2) {
                LOTTERY[i][j] = ALLOCATION[i][j]
                ALLOCATION[i][j] = ZERO_BN
            }

            if (ALLOCATION_RAW[i][j].gt(PREFUNDS[i][j])) {
                // Remaining allocation in this slot
                ALLOCATION_LEFT[i][j] = ALLOCATION_RAW[i][j].sub(PREFUNDS[i][j]) //removable, just to print
                TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.add(ALLOCATION_LEFT[i][j])
            } else {
                // Remaining prefund in this slot
                PREFUNDS_LEFT[i][j] = PREFUNDS[i][j].sub(ALLOCATION_RAW[i][j]) //removable, just to print
                TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.add(PREFUNDS_LEFT[i][j])
                RATIOS[i][j] = ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j])
            }
        }
    }
}

function lotteryDraw(prefundersArray) {

    for (let i = 0; i < 3; i++) {
        let availableSupertutellianSlot = PREFUNDS[1][i]
        while((!LOTTERY[1][i].isZero()) && (!availableSupertutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(MIN_INDEX_LOTTERY_SUPERTUTELLIAN, MAX_INDEX_LOTTERY_SUPERTUTELLIAN)
            const prefunderAvailable = prefundersArray[prefunderIndex].prefunded.div(ethers.BigNumber.from('2')).sub(prefundersArray[prefunderIndex].lottery)
            const maxAmount = prefunderAvailable.gt(LOTTERY[1][i]) ? LOTTERY[1][i] : prefunderAvailable
            const amount = randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
            const amountBN = ethers.utils.parseEther(amount.toString())
            prefundersArray[prefunderIndex].lottery = prefundersArray[prefunderIndex].lottery.add(amountBN)
            LOTTERY[1][i] = LOTTERY[1][i].sub(amountBN)
            availableSupertutellianSlot = availableSupertutellianSlot.sub(amountBN)
        }

        let availableTutellianSlot = PREFUNDS[2][i]
        while((!LOTTERY[2][i].isZero()) && (!availableTutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(MIN_INDEX_LOTTERY_TUTELLIAN, MAX_INDEX_LOTTERY_TUTELLIAN)
            const prefunderAvailable = prefundersArray[prefunderIndex].prefunded.sub(prefundersArray[prefunderIndex].lottery)
            const maxAmount = prefunderAvailable.gt(LOTTERY[2][i]) ? LOTTERY[2][i] : prefunderAvailable
            const amount = randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
            const amountBN = ethers.utils.parseEther(amount.toString())
            prefundersArray[prefunderIndex].lottery = prefundersArray[prefunderIndex].lottery.add(amountBN)
            LOTTERY[2][i] = LOTTERY[2][i].sub(amountBN)
            availableTutellianSlot = availableTutellianSlot.sub(amountBN)
        }
    }

}

function computeDistribution(prefundersArray) {
    const distribution = {}
    const withdraw = {}

    if (TOTAL_PREFUNDS_LEFT.gte(TOTAL_ALLOCATION_LEFT)) {
        // Enough to distribute
        console.log('Prefunds left enough to cover allocation left')

        for (let i = 0; i < prefundersArray.length; i++) {
            if (RATIOS[prefundersArray[i].row][prefundersArray[i].column].isZero()) {
                increasePrefunderAllocation(prefundersArray[i], prefundersArray[i].prefunded)
            } else {
                if (prefundersArray[i].row == 1) {
                    const regularAmount = prefundersArray[i].prefunded.div(ethers.BigNumber.from('2')).mul(RATIOS[prefundersArray[i].row][prefundersArray[i].column]).div(ONE_BN)
                    increasePrefunderAllocation(prefundersArray[i], regularAmount.add(prefundersArray[i].lottery))
                } else if (prefundersArray[i].row == 2) {
                    increasePrefunderAllocation(prefundersArray[i], prefundersArray[i].lottery)
                }
            }

            if ((prefundersArray[i].left.gt(ZERO_BN)) && (TOTAL_PREFUNDS_LEFT.gt(ZERO_BN))) {
                let extraAmount = prefundersArray[i].left.gt(TOTAL_PREFUNDS_LEFT) ? TOTAL_PREFUNDS_LEFT : prefundersArray[i].left
                increasePrefunderAllocation(prefundersArray[i], extraAmount)
                TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.sub(extraAmount)
            }

            distribution[prefundersArray[i].account] = prefundersArray[i].allocated.toString()
            withdraw[prefundersArray[i].account] = prefundersArray[i].left.toString()


            // // If prefund is over allocation in slot calculate portion
            // if (!RATIOS[prefundersArray[i].row][prefundersArray[i].column].isZero()) {
            //     prefundersArray[i].allocated = prefundersArray[i].prefunded.mul(RATIOS[prefundersArray[i].row][prefundersArray[i].column]).div(ONE_BN)
            // }

            // distribution[prefundersArray[i].account] = prefundersArray[i].allocated.toString()
            // prefundersArray[i].left = prefundersArray[i].left.sub(prefundersArray[i].allocated)

            // if (prefundersArray[i].prefunded.gt(prefundersArray[i].allocated)) {
            //     // Calculate remaining amount of prefunded (after regular distribution)
            //     withdraw[prefundersArray[i].account] = prefundersArray[i].prefunded.sub(prefundersArray[i].allocated).toString()

            //     // Calculate extra distribution if there's remaining allocation
            //     let extraAmount = ethers.BigNumber.from(withdraw[prefundersArray[i].account])
            //     if (extraAmount.gt(TOTAL_PREFUNDS_LEFT)) extraAmount = TOTAL_PREFUNDS_LEFT
            //     TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.sub(extraAmount)
            //     withdraw[prefundersArray[i].account] = ethers.BigNumber.from(withdraw[prefundersArray[i].account]).sub(extraAmount).toString()

            //     // (Re)calculate remaining amount of prefunded (after extra distribution)
            //     if (prefundersArray[i].prefunded.gt(prefundersArray[i].allocated)) {
            //         withdraw[prefundersArray[i].account] = ethers.utils.formatEther(prefundersArray[i].prefunded.sub(prefundersArray[i].allocated).toString())
            //     }
            // }
        }
    } else {
        // Not enough to distribute
        console.log('Prefunds left NOT enough to cover allocation left')
        console.log(ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT.sub(TOTAL_PREFUNDS_LEFT)), ' USDT left')
    }

    return [distribution, withdraw]
}

function increasePrefunderAllocation(prefunder, amount) {
    if (prefunder.allocated === undefined) prefunder.allocated = ZERO_BN
    if (prefunder.left === undefined) prefunder.left = prefunder.prefunded
    prefunder.allocated = prefunder.allocated.add(amount)
    prefunder.left = prefunder.left.sub(amount)
}

async function getIDO() {
    let query = '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }'
    return (await querySubgraph(query)).ido
}

async function sortPrefunders(prefunds) {
    //sort by factions
    prefunds.sort((a, b) => FACTION_TO_RANKING[a.faction] - FACTION_TO_RANKING[b.faction])
    //sort by energy inside faction
    prefunds.sort(function (a, b) {
        if (FACTION_TO_RANKING[a.faction] === FACTION_TO_RANKING[b.faction]) {
            return parseFloat(b.energyHolder.balance.toString()) - parseFloat(a.energyHolder.balance.toString())
        }
        return 0
    })
    return prefunds
}

async function getPrefunders() {
    let query = '{ prefunders (where: {ido:"' + IDO.toLowerCase() + '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balance } } }'
    return (await querySubgraph(query)).prefunders
}

async function getFactions() {
    let query = '{ factions (orderBy: energy, orderDirection:desc) { id energy } }'
    return await querySubgraph(query)
}

async function querySubgraph(query) {
    let response;
    let responseData;

    try {
        response = await fetch(GRAPH_URL, {
            "method": 'POST',
            "headers": {
                "Accept": 'application/json',
                'Content-Type': 'application/json',
            },
            "body": JSON.stringify({
                query: query
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

function isSupertutellian(prefunder) {
    return SUPERTUTELLIAN_LIMIT_BN.lte(prefunder.energyHolder.balance)
}

function isTop() {
    if (!(N_TOPS_LEFT > 0)) return false
    N_TOPS_LEFT--
    return true
}

function isWinner(account) {
    return true
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function setWinnerFaction(prefunders) {
    const factions = (await getFactions()).factions
    const indexObj = {}

    for (let i = 0; i < factions.length; i++) {
        factions[i].energy = ZERO_BN
        indexObj[factions[i].id] = i
    }

    for (let i = 0; i < prefunders.length; i++) {
        factions[indexObj[prefunders[i].faction]].energy = factions[indexObj[prefunders[i].faction]].energy.add(prefunders[i].energyHolder.balance)
    }

    factions.sort((a, b) => parseFloat(b.energy.toString()) - parseFloat(a.energy.toString()))

    for (let i = 0; i < factions.length; i++) {
        FACTION_TO_RANKING[factions[i].id] = i
    }
}
