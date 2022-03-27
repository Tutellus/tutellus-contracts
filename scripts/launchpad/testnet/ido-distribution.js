const { ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs')
const path = require('path')
const IDO = '0xb510cc1Ff1CEc64999A859282A71c73380106E68'
const ENERGY_ADDR = '0xb203bf1fBF26590B79eeCF4F0440dED958E13359'
const POAP_ID = '0x920fe3daba3d7e2f76b6bf2cd29ede1505083df5202d94862a7bb5c8bb3b4806'
const jsonPath = '../../../examples/testnet/launchpad/' + IDO.toLowerCase() + '.json'

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad'
const ZERO_BN = ethers.utils.parseEther('0')
const ONE_BN = ethers.utils.parseEther('1')
const HUNDRED_BN = ethers.utils.parseEther('100')
const SUPERTUTELLIAN_LIMIT_BN = ethers.utils.parseEther('1500')
const N_TOPS = 3
let N_TOPS_LEFT = N_TOPS

const FACTION_TO_RANKING = {
    '0xe33b57b9ff16e65a8c081e942bac1ac7295aed81796ec2c3e9aabc459783f2ae': -1,
    '0x771dccb6a31b3e1604e08ac8b9186bf28341bbadf563d1030aefdd5dca42a071': -1,
    '0x0e81077977837f8edfe8400a2d3179a5cd6638e46487625a742c2f8dc9f53ce4': -1
}

// names probably wrong
const FACTION_TO_NAME = {
    '0xe33b57b9ff16e65a8c081e942bac1ac7295aed81796ec2c3e9aabc459783f2ae': 'NAKAMOTOS',
    '0x771dccb6a31b3e1604e08ac8b9186bf28341bbadf563d1030aefdd5dca42a071': 'VUTERINS',
    '0x7e1ee7b85790db7769a1da3114adec489e4583fc3a62d944b2f861d832e62bc5': 'ALTCOINERS'
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
let TOTAL_ALLOCATION = ZERO_BN

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

const SUPERTUTELLIAN_LOTTERY = [[],[],[]]
const TUTELLIAN_LOTTERY = [[],[],[]]

const mathObj = {
    blockTimestamp: ethers.BigNumber.from(parseInt(Date.now() / 1000).toString()), //TBD: review if valid
    lastUpdateTimestamp: 0,
    rate: 0,
    secondsPerYear: ethers.BigNumber.from('31536000'),
    ray: ethers.BigNumber.from('1000000000000000000000000000'),
    normalization: 0,
    halfRAY: ethers.BigNumber.from('500000000000000000000000000'),
}

async function main() {
    const ido = await getIDO()
    const fundingAmountBN = ethers.BigNumber.from(ido.fundingAmount)
    const prefundedBN = ethers.BigNumber.from(ido.prefunded)
    console.log('Needed: ', ethers.utils.formatEther(fundingAmountBN))
    console.log('Available: ', ethers.utils.formatEther(prefundedBN))

    if (fundingAmountBN.gt(prefundedBN)) {
        console.log('Funding is over prefunded amount')
    } else {

        await setMathObj()

        // Get all IDO prefunders by IDO
        let prefunders = await getPrefunders()

        const energyObj = computePrefundersEnergy(prefunders)

        // Calculate factions ranking
        await setWinnerFaction(prefunders, energyObj)

        // Sort prefunders by factions (and by energy inside factions)
        prefunders = sortPrefundersByEnergy(prefunders, energyObj)

        // Classify prefunders in slots (and calc total prefund by slot)
        const prefundersArray = classifyPrefunders(prefunders, energyObj)

        // Calculate aggregated amounts of slots
        calculateSlotTotals(fundingAmountBN)

        lotteryDraw()

        sortPrefundersByRowAndColumn(prefundersArray)
        // Calculate amounts of each prefunder
        const json = computeDistribution(prefundersArray)

        if (fundingAmountBN.gt(TOTAL_ALLOCATION)) allocateFinalRemainder(prefundersArray, fundingAmountBN.sub(TOTAL_ALLOCATION), json)

        console.log(ethers.utils.formatEther(ALLOCATION[0][0]), '  ', ethers.utils.formatEther(ALLOCATION[0][1]), '  ', ethers.utils.formatEther(ALLOCATION[0][2]), '  ')
        console.log(ethers.utils.formatEther(ALLOCATION[1][0]), '  ', ethers.utils.formatEther(ALLOCATION[1][1]), '  ', ethers.utils.formatEther(ALLOCATION[1][2]), '  ')
        console.log(ethers.utils.formatEther(ALLOCATION[2][0]), '  ', ethers.utils.formatEther(ALLOCATION[2][1]), '  ', ethers.utils.formatEther(ALLOCATION[2][2]), '  ')
        console.log('-----')
        console.log(ethers.utils.formatEther(PREFUNDS[0][0]), '  ', ethers.utils.formatEther(PREFUNDS[0][1]), '  ', ethers.utils.formatEther(PREFUNDS[0][2]), '  ')
        console.log(ethers.utils.formatEther(PREFUNDS[1][0]), '  ', ethers.utils.formatEther(PREFUNDS[1][1]), '  ', ethers.utils.formatEther(PREFUNDS[1][2]), '  ')
        console.log(ethers.utils.formatEther(PREFUNDS[2][0]), '  ', ethers.utils.formatEther(PREFUNDS[2][1]), '  ', ethers.utils.formatEther(PREFUNDS[2][2]), '  ')
        console.log('-----')
        console.log(ethers.utils.formatEther(LOTTERY[0][0]), '  ', ethers.utils.formatEther(LOTTERY[0][1]), '  ', ethers.utils.formatEther(LOTTERY[0][2]), '  ')
        console.log(ethers.utils.formatEther(LOTTERY[1][0]), '  ', ethers.utils.formatEther(LOTTERY[1][1]), '  ', ethers.utils.formatEther(LOTTERY[1][2]), '  ')
        console.log(ethers.utils.formatEther(LOTTERY[2][0]), '  ', ethers.utils.formatEther(LOTTERY[2][1]), '  ', ethers.utils.formatEther(LOTTERY[2][2]), '  ')
        console.log('-----')
        console.log(ethers.utils.formatEther(RATIOS[0][0]), '  ', ethers.utils.formatEther(RATIOS[0][1]), '  ', ethers.utils.formatEther(RATIOS[0][2]), '  ')
        console.log(ethers.utils.formatEther(RATIOS[1][0]), '  ', ethers.utils.formatEther(RATIOS[1][1]), '  ', ethers.utils.formatEther(RATIOS[1][2]), '  ')
        console.log(ethers.utils.formatEther(RATIOS[2][0]), '  ', ethers.utils.formatEther(RATIOS[2][1]), '  ', ethers.utils.formatEther(RATIOS[2][2]), '  ')
        console.log(json)

        let leftcounter = ethers.utils.parseEther('0')
        for (let i = 0; i < prefundersArray.length; i++) {
            console.log(prefundersArray[i].account)
            console.log(prefundersArray[i].row)
            console.log(prefundersArray[i].column)
            console.log(ethers.utils.formatEther(prefundersArray[i].prefunded))
            console.log(ethers.utils.formatEther(prefundersArray[i].allocated))
            console.log(ethers.utils.formatEther(prefundersArray[i].lottery))
            console.log(ethers.utils.formatEther(prefundersArray[i].left))
            leftcounter = leftcounter.add(ethers.BigNumber.from(prefundersArray[i].prefunded).sub(ethers.BigNumber.from(prefundersArray[i].allocated)))
        }
        console.log(ethers.utils.formatEther(leftcounter))
        console.log(ethers.utils.formatEther(TOTAL_ALLOCATION))
        console.log(ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT))

        fs.writeFileSync(path.join(__dirname, jsonPath), JSON.stringify(json, null, 4))
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

function classifyPrefunders(prefunders, energyObj) {
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
        obj.energy = energyObj[prefunder.account]

        if (isSupertutellian(prefunder)) {
            if (isTop()) {
                PREFUNDS[0][column] = PREFUNDS[0][column].add(prefunder.prefunded)
                obj.row = 0
            } else {
                PREFUNDS[1][column] = PREFUNDS[1][column].add(prefunder.prefunded)
                obj.row = 1
                SUPERTUTELLIAN_LOTTERY[column].push(obj)
            }
        } else {
            obj.row = 2
            PREFUNDS[2][column] = PREFUNDS[2][column].add(prefunder.prefunded)
            TUTELLIAN_LOTTERY[column].push(obj)
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
            if (i == 0 && !PREFUNDS[i][j].isZero()) {
                RATIOS[i][j] = ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j])
            }

            if (i == 1) {
                LOTTERY[i][j] = ALLOCATION[i][j].div(ethers.BigNumber.from('2'))
                ALLOCATION[i][j] = ALLOCATION[i][j].sub(LOTTERY[i][j])
                if (!PREFUNDS[i][j].isZero()) {
                    RATIOS[i][j] = ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j].div(ethers.BigNumber.from('2')))
                }
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
            }
        }
    }
}

function lotteryDraw() {
    // TBD: problems with <1...sometimes  theres a withdraw of -0.5
    for (let i = 0; i < 3; i++) {
        let availableSupertutellianSlot = PREFUNDS[1][i].div(ethers.BigNumber.from('2'))
        while((!LOTTERY[1][i].isZero()) && (!availableSupertutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(0, SUPERTUTELLIAN_LOTTERY[i].length - 1)
            const maxAvailable = availableSupertutellianSlot.gt(LOTTERY[1][i]) ? LOTTERY[1][i] : availableSupertutellianSlot
            const prefunderAvailable = SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].prefunded.div(ethers.BigNumber.from('2')).sub(SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].lottery)
            const maxAmount = prefunderAvailable.gt(maxAvailable) ? maxAvailable : prefunderAvailable
            let amount
            if (maxAmount.lt(ONE_BN)) {
                amount = parseFloat(ethers.utils.formatEther(maxAmount))
            } else {
                amount = randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
            }
            const amountBN = ethers.utils.parseEther(amount.toString())
            SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].lottery = SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].lottery.add(amountBN)
            if (SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].lottery.gte(SUPERTUTELLIAN_LOTTERY[i][prefunderIndex].prefunded)) SUPERTUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1)
            LOTTERY[1][i] = LOTTERY[1][i].sub(amountBN)
            availableSupertutellianSlot = availableSupertutellianSlot.sub(amountBN)
        }

        let availableTutellianSlot = PREFUNDS[2][i]
        while((!LOTTERY[2][i].isZero()) && (!availableTutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(0, TUTELLIAN_LOTTERY[i].length - 1)
            const maxAvailable = availableTutellianSlot.gt(LOTTERY[2][i]) ? LOTTERY[2][i] : availableTutellianSlot
            const prefunderAvailable = TUTELLIAN_LOTTERY[i][prefunderIndex].prefunded.sub(TUTELLIAN_LOTTERY[i][prefunderIndex].lottery)
            const maxAmount = prefunderAvailable.gt(maxAvailable) ? maxAvailable : prefunderAvailable
            let amountBN
            if (maxAmount.lt(ONE_BN)) {
                amountBN = maxAmount
            } else {
                const amount = randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
                amountBN = ethers.utils.parseEther(amount.toString())
            }
            TUTELLIAN_LOTTERY[i][prefunderIndex].lottery = TUTELLIAN_LOTTERY[i][prefunderIndex].lottery.add(amountBN)
            if (TUTELLIAN_LOTTERY[i][prefunderIndex].lottery.gte(TUTELLIAN_LOTTERY[i][prefunderIndex].prefunded)) TUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1)
            LOTTERY[2][i] = LOTTERY[2][i].sub(amountBN)
            availableTutellianSlot = availableTutellianSlot.sub(amountBN)
        }
    }

}

function computeDistribution(prefundersArray) {
    const json = {}

    if (TOTAL_PREFUNDS_LEFT.gte(TOTAL_ALLOCATION_LEFT)) {
        // Enough to distribute
        console.log('Prefunds left enough to cover allocation left')
        console.log('Allocation left', ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT))
        console.log('Prefunds available', ethers.utils.formatEther(TOTAL_PREFUNDS_LEFT))

        for (let i = 0; i < prefundersArray.length; i++) {
            if (RATIOS[prefundersArray[i].row][prefundersArray[i].column].gte(ONE_BN)) {

                if (prefundersArray[i].row == 0) {
                    increasePrefunderAllocation(prefundersArray[i], prefundersArray[i].prefunded)
                } else if (prefundersArray[i].row == 1) {
                    const regularAmount = prefundersArray[i].prefunded.div(ethers.BigNumber.from('2'))
                    increasePrefunderAllocation(prefundersArray[i], regularAmount.add(prefundersArray[i].lottery))
                }
            } else {
                if (prefundersArray[i].row == 1) {
                    const regularAmount = prefundersArray[i].prefunded.div(ethers.BigNumber.from('2')).mul(RATIOS[prefundersArray[i].row][prefundersArray[i].column]).div(ONE_BN)
                    increasePrefunderAllocation(prefundersArray[i], regularAmount.add(prefundersArray[i].lottery))
                } else if (prefundersArray[i].row == 2) {
                    increasePrefunderAllocation(prefundersArray[i], prefundersArray[i].lottery)
                }
            }

            if ((prefundersArray[i].left.gt(ZERO_BN)) && (TOTAL_ALLOCATION_LEFT.gt(ZERO_BN))) {
                let extraAmount = prefundersArray[i].left.gt(TOTAL_ALLOCATION_LEFT) ? TOTAL_ALLOCATION_LEFT : prefundersArray[i].left
                increasePrefunderAllocation(prefundersArray[i], extraAmount)
                TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.sub(extraAmount)
            }

            const values = {}
            values['allocation'] = prefundersArray[i].allocated.toString()
            values['withdraw'] = prefundersArray[i].left.toString()
            values['energy'] = prefundersArray[i].energy.toString()
            json[prefundersArray[i].account] = values
        }
    } else {
        // Not enough to distribute
        console.log('Prefunds left NOT enough to cover allocation left')
        console.log(ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT.sub(TOTAL_PREFUNDS_LEFT)), ' USDT left')
    }

    return json
}

function allocateFinalRemainder(prefundersArray, remainder, json) {
    let finished = false
    while(!finished) {
        const prefunderIndex = randomIntFromInterval(0, prefundersArray.length - 1)
        const prefunderAvailable = prefundersArray[prefunderIndex].prefunded.sub(prefundersArray[prefunderIndex].allocated)
        if (prefunderAvailable.gte(remainder)) {
            increasePrefunderAllocation(prefundersArray[prefunderIndex], remainder)
            const values = {}
            values['allocation'] = prefundersArray[prefunderIndex].allocated.toString()
            values['withdraw'] = prefundersArray[prefunderIndex].left.toString()
            values['energy'] = prefundersArray[prefunderIndex].energy.toString()
            json[prefundersArray[prefunderIndex].account] = values
            finished = true;
        }
    }
}

function increasePrefunderAllocation(prefunder, amount) {
    if (prefunder.allocated === undefined) prefunder.allocated = ZERO_BN
    if (prefunder.left === undefined) prefunder.left = prefunder.prefunded
    prefunder.allocated = prefunder.allocated.add(amount)
    prefunder.left = prefunder.left.sub(amount)
    TOTAL_ALLOCATION = TOTAL_ALLOCATION.add(amount)
}

async function getIDO() {
    let query = '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }'
    return (await querySubgraph(query)).ido
}

async function setMathObj() {
    let query = '{ energy (id:"' + ENERGY_ADDR.toLowerCase() + '") { lastUpdateTimestamp rate normalization } }'
    let obj = (await querySubgraph(query)).energy
    mathObj.rate = ethers.BigNumber.from(obj.rate)
    mathObj.normalization = ethers.BigNumber.from(obj.normalization)
    mathObj.lastUpdateTimestamp = ethers.BigNumber.from(obj.lastUpdateTimestamp)
}

function sortPrefundersByEnergy(prefunds, energyObj) {
    //sort by energy
    prefunds.sort((a, b) => parseFloat(energyObj[b.account].toString()) - parseFloat(energyObj[a.account].toString()))
    return prefunds
}

function sortPrefundersByRowAndColumn(prefunds) {
    //sort by column
    prefunds.sort((a, b) => a.column - b.column)
    //sort by row
    prefunds.sort(function (a, b) {
        if (a.column === b.column) {
            return a.row - b.row
        }
        return 0
    })
    return prefunds
}

function computePrefundersEnergy(prefunders) {
    const energyObj = {}
    for (let i = 0; i < prefunders.length; i++) {
        let energyStatic = ethers.BigNumber.from(prefunders[i].energyHolder.balanceStatic)
        let energyVariable = unscaleEnergyVariable(ethers.BigNumber.from(prefunders[i].energyHolder.balanceVariable))
        let energyPOAP = prefunders[i].energyHolder.poaps.length > 0 ? ethers.BigNumber.from(prefunders[i].energyHolder.poaps[0].balance) : ethers.BigNumber.from('0')
        energyObj[prefunders[i].account] = energyStatic.add(energyVariable).add(energyPOAP)
    }
    return energyObj
}

function unscaleEnergyVariable(amount) {
    return rayMul(amount, getNormalization())
}

function getNormalization() {
    const timestamp = mathObj.lastUpdateTimestamp
    if (timestamp.eq(mathObj.blockTimestamp)) return mathObj.normalization
    let result = calculateLinearInterest(timestamp)
    return rayMul(result, mathObj.normalization)
}

function rayMul(a, b) {
    if (a == 0 || b == 0) return 0
    console.log(((a.mul(b)).add(mathObj.halfRAY)).div(mathObj.ray).toString())
    return ((a.mul(b)).add(mathObj.halfRAY)).div(mathObj.ray)
}

function calculateLinearInterest(lastUpdateTimestamp) {
    const timeDifference = mathObj.blockTimestamp.sub(lastUpdateTimestamp)
    return (mathObj.rate.mul(timeDifference).div(mathObj.secondsPerYear)).add(mathObj.ray)
}

async function getPrefunders() {
    let query = '{ prefunders (where: {ido:"' + IDO.toLowerCase() + '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"'+ POAP_ID.toLowerCase() +'"}) { balance } } } }'
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
    return SUPERTUTELLIAN_LIMIT_BN.lte(prefunder.energyHolder.balanceVariable) //TBD: review condition
}

function isTop() {
    if (!(N_TOPS_LEFT > 0)) return false
    N_TOPS_LEFT--
    return true
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function setWinnerFaction(prefunders, energyObj) {
    const factions = (await getFactions()).factions
    const indexObj = {}

    for (let i = 0; i < factions.length; i++) {
        factions[i].energy = ZERO_BN
        indexObj[factions[i].id] = i
    }

    for (let i = 0; i < prefunders.length; i++) {
        factions[indexObj[prefunders[i].faction]].energy = factions[indexObj[prefunders[i].faction]].energy.add(energyObj[prefunders[i].account])
    }

    factions.sort((a, b) => parseFloat(b.energy.toString()) - parseFloat(a.energy.toString()))

    console.log('Factions ranking:')
    for (let i = 0; i < factions.length; i++) {
        FACTION_TO_RANKING[factions[i].id] = i
        console.log(FACTION_TO_NAME[factions[i].id])
    }
}
