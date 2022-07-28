const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs')
const path = require('path');

const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')

const LP_TOKEN = '0xfd5447D667eB6960fA326cfa68b7936f52940cA7'
const IDO = '0x3a00d1b1F4Fa768801Dd416E43930808C72c80e9'
const ENERGY_ADDR = '0xd0977Cce3094772297ACB21c41cd44752D7768Ed'
const POAP_ID = '0x920fe3daba3d7e2f76b6bf2cd29ede1505083df5202d94862a7bb5c8bb3b4806'
const jsonPath = '../../../examples/testnet/launchpad/' + IDO.toLowerCase() + '.json'

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad-goerli'
const ZERO_BN = ethers.utils.parseEther('0')
const ONE_BN = ethers.utils.parseEther('1')
const TWO_WEI_BN = ethers.BigNumber.from('2')
const HUNDRED_BN = ethers.utils.parseEther('100')
const STANDARD_LIMIT_BN = ethers.utils.parseEther('100')
const SUPERBOOSTER_LIMIT_BN = ethers.utils.parseEther('600')
const N_TOPS = 1
let N_TOPS_LEFT = N_TOPS
let RESERVES_TUT, LP_TOTAL_SUPPLY

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

const LOTTERY = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

const RATIOS = [
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN],
    [ZERO_BN, ZERO_BN, ZERO_BN]
]

let TOTAL_ALLOCATION_LEFT = ZERO_BN
let TOTAL_ALLOCATION = ZERO_BN
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

const PREFUNDERS = new Object()
const FACTIONS = new Object()
FACTIONS[NAKAMOTOS_FACTION] = {energy: ZERO_BN, ranking: -1}
FACTIONS[VUTERINS_FACTION] = {energy: ZERO_BN, ranking: -1}
FACTIONS[ALTCOINERS_FACTION] = {energy: ZERO_BN, ranking: -1}

async function main() {
    await getReserves()
    const ido = await getIDO()
    const fundingAmountBN = ethers.BigNumber.from(ido.fundingAmount)
    const prefundedBN = ethers.BigNumber.from(ido.prefunded)
    console.log('Needed: ', ethers.utils.formatEther(fundingAmountBN))
    console.log('Available: ', ethers.utils.formatEther(prefundedBN))

    if (fundingAmountBN.gt(prefundedBN)) {
        console.log('Funding is over prefunded amount')
    } else {

        await setMathObj()

        await setWinnerFaction()

        const prefunders = await getPrefunders()
        const stakers = (await getStakers(prefunders)).stakers
        buildObject(prefunders, stakers)

        console.log(FACTIONS)

        sortPrefundersByEnergy()

        buildMatrixs(fundingAmountBN)

        distributeAllocationFixed()

        distributeAllocationLottery()

        distributeAllocationLeft()

        stringifyBNInJson()

        console.log(PREFUNDERS)

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

        fs.writeFileSync(path.join(__dirname, jsonPath), JSON.stringify(PREFUNDERS, null, 4))
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

/******** CORE */

async function setWinnerFaction() {
    const factions = (await getSubgraphDataByIdo()).factionByIDOs //TBD: use FactionsByIDO?

    for(let i = 0; i < factions.length; i++) {
        const key = factions[i].faction.id
        FACTIONS[key].ranking = i
        FACTIONS[key].energy = unscaleEnergyVariable(ethers.BigNumber.from(factions[i].energy))
    }

    let ranking = 2
    for (let faction in FACTIONS) {
        if (FACTIONS[faction].ranking == -1) {
            FACTIONS[faction].ranking = ranking
            ranking--
        }
    }
}

function buildObject(prefundersArray, stakersArray) {
    prefundersArray.forEach(function(prefunder) {
        const key = prefunder.account.toLowerCase()
        PREFUNDERS[key] = getEmptyValuesObject()

        // Set initial values
        PREFUNDERS[key].account = key
        PREFUNDERS[key].faction = prefunder.faction
        PREFUNDERS[key].prefund = ethers.BigNumber.from(prefunder.prefunded)
        PREFUNDERS[key].refund = ethers.BigNumber.from(prefunder.prefunded)
        PREFUNDERS[key].account = key

        // Calculate total energy
        const energyStatic = ethers.BigNumber.from(prefunder.energyHolder.balanceStatic)
        const energyVariable = unscaleEnergyVariable(ethers.BigNumber.from(prefunder.energyHolder.balanceVariable))
        const energyPOAP = prefunder.energyHolder.poaps.length > 0 ? ethers.BigNumber.from(prefunder.energyHolder.poaps[0].balance) : ethers.BigNumber.from('0')
        PREFUNDERS[key].energy = energyStatic.add(energyVariable).add(energyPOAP)

        // Calculate total staked TUT (staking + farming)
        const objs = stakersArray.filter(o => o.account === key)
        objs.forEach(function(obj) {
            const amountBN = new ethers.BigNumber.from(obj.amount)
            const tutAmount = obj.type == 1 ? amountBN : transformLpToTut(amountBN)
            PREFUNDERS[key].staked = PREFUNDERS[key].staked.add(tutAmount)
        })

        const staked = PREFUNDERS[key].staked
        PREFUNDERS[key].type = !isStandard(staked) ? 3 : !isSuperBooster(staked) ? 2 : isTop() ? 0 : 1

        const row = PREFUNDERS[key].type
        const column = FACTIONS[PREFUNDERS[key].faction].ranking
        PREFUNDERS[key].row = row
        PREFUNDERS[key].column = column

        PREFUNDS[row][column] = PREFUNDS[row][column].add(PREFUNDERS[key].prefund)

        if (row == 1) SUPERTUTELLIAN_LOTTERY[column].push(key)
        if (row == 2) TUTELLIAN_LOTTERY[column].push(key)
    })
}

function sortPrefundersByEnergy() {
    //sort by energy
    const sortable = []

    for (let key in PREFUNDERS) {
        sortable.push(PREFUNDERS[key])
    }

    sortable.sort((a, b) => parseFloat(b.energy.toString()) - parseFloat(a.energy.toString()))

    for (let i = 0; i < sortable.length; i++) {
        const key = sortable[i].account
        PREFUNDERS[key].ranking = i
    }
}

function buildMatrixs(fundingAmountBN) {
    for (let i = 0; i < ALLOCATION.length; i++) {
        for (let j = 0; j < ALLOCATION[i].length; j++) {
            // Calculate available amounts (in USDT) by slot
            ALLOCATION[i][j] = fundingAmountBN.mul(ALLOCATION_PERCENTAGES[i][j]).div(HUNDRED_BN)
            const initialAllocation = ALLOCATION[i][j]

            // Derivate amount available to lottery by slot
            if (i == 0 && !PREFUNDS[i][j].isZero()) {
                RATIOS[i][j] = ALLOCATION[i][j].gte(PREFUNDS[i][j]) ? ONE_BN : ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j])
            }

            if (i == 1) {
                LOTTERY[i][j] = ALLOCATION[i][j].div(TWO_WEI_BN)
                ALLOCATION[i][j] = ALLOCATION[i][j].sub(LOTTERY[i][j])
                if (!PREFUNDS[i][j].isZero()) {
                    RATIOS[i][j] = ALLOCATION[i][j].gte(PREFUNDS[i][j].div(TWO_WEI_BN)) ? ONE_BN : ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j].div(TWO_WEI_BN))
                }
            }

            if (i == 2) {
                LOTTERY[i][j] = ALLOCATION[i][j]
                ALLOCATION[i][j] = ZERO_BN
            }

            if (initialAllocation.gt(PREFUNDS[i][j])) {
                // Remaining allocation in this slot
                TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.add(initialAllocation.sub(PREFUNDS[i][j]))
            } else {
                // Remaining prefund in this slot
                TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.add(PREFUNDS[i][j].sub(initialAllocation))
            }
        }
    }
}

function distributeAllocationFixed() {
    for(let key in PREFUNDERS) {
        const prefunder = PREFUNDERS[key]
        const row = prefunder.row
        const column = prefunder.column
        if (row < 2) {
            const prefund = row == 0 ? prefunder.prefund : prefunder.prefund.div(TWO_WEI_BN)
            const allocationUsdt = prefund.mul(RATIOS[row][column]).div(ONE_BN)
            increasePrefunderAllocation(key, allocationUsdt)
        }
    }
}

function distributeAllocationLottery() {
    // TBD: problems with <1...sometimes  theres a withdraw of -0.5
    for (let i = 0; i < 3; i++) {
        let availableSupertutellianSlot = PREFUNDS[1][i].div(TWO_WEI_BN)
        while((!LOTTERY[1][i].isZero()) && (!availableSupertutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(0, SUPERTUTELLIAN_LOTTERY[i].length - 1)
            const key = SUPERTUTELLIAN_LOTTERY[i][prefunderIndex]
            const prefunder = PREFUNDERS[key]
            const maxAvailable = availableSupertutellianSlot.gt(LOTTERY[1][i]) ? LOTTERY[1][i] : availableSupertutellianSlot
            const prefunderAvailable = prefunder.refund
            const maxAmount = prefunderAvailable.gt(maxAvailable) ? maxAvailable : prefunderAvailable
            const amount = maxAmount.lt(ONE_BN) ? parseFloat(ethers.utils.formatEther(maxAmount)) : randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
            const amountBN = ethers.utils.parseEther(amount.toString())
            const removeKeyFromLottery = increasePrefunderLottery(key, amountBN)
            if (removeKeyFromLottery) SUPERTUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1)
            LOTTERY[1][i] = LOTTERY[1][i].sub(amountBN)
            availableSupertutellianSlot = availableSupertutellianSlot.sub(amountBN)
        }

        let availableTutellianSlot = PREFUNDS[2][i]
        while((!LOTTERY[2][i].isZero()) && (!availableTutellianSlot.isZero())) {
            const prefunderIndex = randomIntFromInterval(0, TUTELLIAN_LOTTERY[i].length - 1)
            const key = TUTELLIAN_LOTTERY[i][prefunderIndex]
            const prefunder = PREFUNDERS[key]
            const maxAvailable = availableTutellianSlot.gt(LOTTERY[2][i]) ? LOTTERY[2][i] : availableTutellianSlot
            const prefunderAvailable = prefunder.refund
            const maxAmount = prefunderAvailable.gt(maxAvailable) ? maxAvailable : prefunderAvailable
            const amount = maxAmount.lt(ONE_BN) ? parseFloat(ethers.utils.formatEther(maxAmount)) : randomIntFromInterval(0, parseFloat(ethers.utils.formatEther(maxAmount)))
            const amountBN = ethers.utils.parseEther(amount.toString())
            const removeKeyFromLottery = increasePrefunderLottery(key, amountBN)
            if (removeKeyFromLottery) TUTELLIAN_LOTTERY[i].splice(prefunderIndex, 1)
            LOTTERY[2][i] = LOTTERY[2][i].sub(amountBN)
            availableTutellianSlot = availableTutellianSlot.sub(amountBN)
        }
    }
}

function distributeAllocationLeft() {
    if (TOTAL_PREFUNDS_LEFT.gte(TOTAL_ALLOCATION_LEFT)) {
        // Enough to distribute
        console.log('Prefunds left enough to cover allocation left')
        console.log('Allocation left', ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT))
        console.log('Prefunds available', ethers.utils.formatEther(TOTAL_PREFUNDS_LEFT))

        const sortable = []
        for (let key in PREFUNDERS) {
            sortable.push(PREFUNDERS[key])
        }
        sortable.sort((a, b) => a.ranking - b.ranking)

        for(let i in sortable) {
            const key = sortable[i].account
            const prefunder = PREFUNDERS[key]
            
            if ((prefunder.refund.gt(ZERO_BN)) && (TOTAL_ALLOCATION_LEFT.gt(ZERO_BN))) {
                const extraAmountBN = prefunder.refund.gt(TOTAL_ALLOCATION_LEFT) ? TOTAL_ALLOCATION_LEFT : prefunder.refund
                increasePrefunderLeft(key, extraAmountBN)
            }
        }
    } else {
        // Not enough to distribute
        console.log('Prefunds left NOT enough to cover allocation left')
        console.log(ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT.sub(TOTAL_PREFUNDS_LEFT)), ' USDT left')
    }
}

function stringifyBNInJson() {
    for (let key in PREFUNDERS) {
        PREFUNDERS[key].energy = PREFUNDERS[key].energy.toString()
        PREFUNDERS[key].allocation = PREFUNDERS[key].allocation.toString()
        PREFUNDERS[key].prefund = PREFUNDERS[key].prefund.toString()
        PREFUNDERS[key].lottery = PREFUNDERS[key].lottery.toString()
        PREFUNDERS[key].refund = PREFUNDERS[key].refund.toString()
        PREFUNDERS[key].left = PREFUNDERS[key].left.toString()
        PREFUNDERS[key].staked = PREFUNDERS[key].staked.toString()

        delete PREFUNDERS[key].row
        delete PREFUNDERS[key].column
    }
}

/******** UTILS */

function increasePrefunderLeft(key, amountBN) {
    increasePrefunderAllocation(key, amountBN)
    PREFUNDERS[key].left = PREFUNDERS[key].left.add(amountBN) //TBD: use price to calculate allocation in ido-token
    TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.sub(amountBN)
}

function increasePrefunderLottery(key, amountBN) {
    increasePrefunderAllocation(key, amountBN)
    PREFUNDERS[key].lottery = PREFUNDERS[key].lottery.add(amountBN) //TBD: use price to calculate allocation in ido-token
    return PREFUNDERS[key].refund.isZero()
}

function increasePrefunderAllocation(key, amountBN) {
    PREFUNDERS[key].refund = PREFUNDERS[key].refund.sub(amountBN)
    PREFUNDERS[key].allocation = PREFUNDERS[key].allocation.add(amountBN) //TBD: use price to calculate allocation in ido-token
    TOTAL_ALLOCATION = TOTAL_ALLOCATION.add(amountBN)
}

function getEmptyValuesObject() {
    const object = new Object()
    object.account = ethers.constants.AddressZero
    object.ranking = -1
    object.type = -1
    object.faction = ethers.constants.HashZero
    object.energy = ZERO_BN
    object.allocation = ZERO_BN
    object.prefund = ZERO_BN
    object.lottery = ZERO_BN
    object.refund = ZERO_BN
    object.left = ZERO_BN
    object.staked = ZERO_BN
    object.row = -1
    object.column = -1
    return object
}

/******** MATH UTILS */

function transformLpToTut(lpAmount) {
    const lpShare = lpAmount.mul(ONE_BN).div(LP_TOTAL_SUPPLY)
    return RESERVES_TUT.mul(TWO_WEI_BN).mul(lpShare).div(ONE_BN)
}

async function getReserves() {
    const contract = await ethers.getContractAt('IUniswapV2Pair', LP_TOKEN)
    const reserves = await contract.getReserves()
    RESERVES_TUT = new ethers.BigNumber.from(reserves.reserve0)
    LP_TOTAL_SUPPLY = await contract.totalSupply()
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
    return ((a.mul(b)).add(mathObj.halfRAY)).div(mathObj.ray)
}

function calculateLinearInterest(lastUpdateTimestamp) {
    const timeDifference = mathObj.blockTimestamp.sub(lastUpdateTimestamp)
    return (mathObj.rate.mul(timeDifference).div(mathObj.secondsPerYear)).add(mathObj.ray)
}

function isSuperBooster(tutAmount) {
    return SUPERBOOSTER_LIMIT_BN.lte(tutAmount) //TBD: review condition
}

function isStandard(tutAmount) {
    return STANDARD_LIMIT_BN.lte(tutAmount) //TBD: review condition
}

function isTop() {
    if (!(N_TOPS_LEFT > 0)) return false
    N_TOPS_LEFT--
    return true
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

/******** SUBGRAPH */

async function getStakers(prefunders) {
    //TBD: prepare to >1000
    let array = '"'
    for(let i = 0; i < prefunders.length - 1; i++) {
        array = array.concat(prefunders[i].account.toLowerCase()).concat('", "')
    }
    array = array.concat(prefunders[prefunders.length - 1].account.toLowerCase()).concat('"')
    let query = '{ stakers (where: {account_in:[' + array + '], amount_gt:0}) { account type contract amount } }'
    return await querySubgraph(query)
}

async function getPrefunders() {
    let query = '{ prefunders (where: {ido:"' + IDO.toLowerCase() + '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balanceVariable balanceStatic poaps(where:{poap:"'+ POAP_ID.toLowerCase() +'"}) { balance } } } }'
    return (await querySubgraph(query)).prefunders
}

async function getSubgraphDataByIdo() {
    let query = '{ factionByIDOs (where:{ido:"' + IDO.toLowerCase() + '"}, orderBy:"energy", orderDirection:desc) { energy faction { id } } }'
    return await querySubgraph(query)
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