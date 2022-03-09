const { ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad'
const ZERO_BN = ethers.utils.parseEther('0')
const ONE_BN = ethers.utils.parseEther('1')
const HUNDRED_BN = ethers.utils.parseEther('100')
const SUPERTUTELLIAN_LIMIT_BN = ethers.utils.parseEther('1500')
const N_TOPS = 1
let N_TOPS_LEFT = N_TOPS
const IDO = '0xb52daeeea7a3f1bc8574768e09238d6ab4b0f362'

const factionToRanking = {
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

async function main() {
    const ido = await getIDO()
    const fundingAmount = ido.ido.fundingAmount
    const fundingAmountBN = ethers.BigNumber.from(fundingAmount)
    const prefunded = ido.ido.prefunded
    const prefundedBN = ethers.BigNumber.from(prefunded)

    if (fundingAmountBN.gt(prefundedBN)) {
        console.log('Funding is over prefunded amount')
    } else {
        for (let i = 0; i < ALLOCATION.length; i++) {
            for(let j = 0; j < ALLOCATION[i].length; j++) {
                ALLOCATION[i][j] = fundingAmountBN.mul(ALLOCATION_PERCENTAGES[i][j]).div(HUNDRED_BN)
            }
        }

        const prefunds = await getSortedPrefunds()
        await setWinnerFaction(prefunds)

        let prefunder, column
        const prefundersArray = []
        for (let i = 0; i < prefunds.length; i++) {
            prefunder = prefunds[i]
            column = factionToRanking[prefunder.faction]
            let obj = new Object()
            obj.account = prefunder.account
            obj.faction = prefunder.faction
            obj.prefunded = ethers.BigNumber.from(prefunder.prefunded)
            obj.allocated = ethers.BigNumber.from(prefunder.prefunded)
            obj.column = column

            if (isSupertutellian(prefunder)) {
                if (isTop()) {
                    PREFUNDS[0][column] = PREFUNDS[0][column].add(prefunds[i].prefunded)
                    obj.row = 0
                } else {
                    PREFUNDS[1][column] = PREFUNDS[1][column].add(prefunds[i].prefunded)
                    obj.row = 1
                }
            } else {
                if (isWinner(prefunder)) {
                    PREFUNDS[2][column] = PREFUNDS[2][column].add(prefunds[i].prefunded)
                    obj.row = 2
                } else {
                    obj.allocated = ZERO_BN
                }
            }

            prefundersArray.push(obj)
        }

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

        for (let i = 0; i < ALLOCATION.length; i++) {
            for (let j = 0; j < ALLOCATION[i].length; j++) {
                if (ALLOCATION[i][j].gt(PREFUNDS[i][j])) {
                    ALLOCATION_LEFT[i][j] = ALLOCATION[i][j].sub(PREFUNDS[i][j])
                    TOTAL_ALLOCATION_LEFT = TOTAL_ALLOCATION_LEFT.add(ALLOCATION_LEFT[i][j])
                } else {
                    PREFUNDS_LEFT[i][j] = PREFUNDS[i][j].sub(ALLOCATION[i][j])
                    TOTAL_PREFUNDS_LEFT = TOTAL_PREFUNDS_LEFT.add(PREFUNDS_LEFT[i][j])
                    RATIOS[i][j] = ALLOCATION[i][j].mul(ONE_BN).div(PREFUNDS[i][j])
                }
            }
        }

        const distribution = {}
        const withdraw = {}

        if (TOTAL_PREFUNDS_LEFT.gte(TOTAL_ALLOCATION_LEFT)) {
            // Enough to distribute
            console.log('Prefunds left enough to cover allocation left')

            for (let i = 0; i < prefundersArray.length; i++) {
                if (!RATIOS[prefundersArray[i].row][prefundersArray[i].column].isZero()) {
                    prefundersArray[i].allocated = prefundersArray[i].prefunded.mul(RATIOS[prefundersArray[i].row][prefundersArray[i].column]).div(ONE_BN)
                }

                distribution[prefundersArray[i].account] = ethers.utils.formatEther(prefundersArray[i].allocated.toString())
                if (prefundersArray[i].prefunded.gt(prefundersArray[i].allocated)) {
                    withdraw[prefundersArray[i].account] = ethers.utils.formatEther(prefundersArray[i].prefunded.sub(prefundersArray[i].allocated).toString())
                }
            }
        } else {
            // Not enough to distribute
            console.log('Prefunds left NOT enough to cover allocation left')
            console.log(ethers.utils.formatEther(TOTAL_ALLOCATION_LEFT.sub(TOTAL_PREFUNDS_LEFT)), ' USDT left')
        }

        console.log(distribution)
        console.log(withdraw)
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

async function getIDO() {
    let query = '{ ido (id:"' + IDO.toLowerCase() + '") { fundingAmount prefunded } }'
    return await querySubgraph(query)
}

async function getSortedPrefunds() {
    let prefunds = (await getPrefunds()).prefunders
    prefunds.sort((a, b) => parseFloat(b.energyHolder.balance.toString()) - parseFloat(a.energyHolder.balance.toString()))
    return prefunds
}

async function getPrefunds() {
    let query = '{ prefunders (where: {ido:"' + IDO.toLowerCase() + '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded energyHolder { balance } } }'
    return await querySubgraph(query)
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
        factionToRanking[factions[i].id] = i
    }
}
