const { ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad'
const ZERO_BN = ethers.utils.parseEther('0')
const HUNDRED_BN = ethers.utils.parseEther('100')
const IDO = '0xb52daeeea7a3f1bc8574768e09238d6ab4b0f362'

const factionToRanking = {
    '0x07c5159843a958fc71baf890fe7145df06430f1ad3c3c8511dd37924fc4f08a8': 0,
    '0x72f929da653bc165dcca2c0b934092fec6fa3a17347ffce347de5cea411a9abc': 1,
    '0x0e81077977837f8edfe8400a2d3179a5cd6638e46487625a742c2f8dc9f53ce4': 2
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

const ALLOCATION = PREFUNDS

async function main() {
    const ido = await getIDO()
    const fundingAmount = ido.ido.fundingAmount
    const fundingAmountBN = ethers.BigNumber.from(fundingAmount)

    for (let i = 0; i < ALLOCATION.length; i++) {
        for(let j = 0; j < ALLOCATION[i].length; j++) {
            ALLOCATION[i][j] = fundingAmountBN.mul(ALLOCATION_PERCENTAGES[i][j]).div(HUNDRED_BN)
        }
    }
    const prefunds = await getPrefunds()

    for (let i = 0; i < PREFUNDS.length; i++) {
        for(let j = 0; j < PREFUNDS[i].length; j++) {
            for(let k = 0; k < PREFUNDS[i][j].length; k++) {
                PREFUNDS[i][j] = PREFUNDS[i][j].add(prefunds[i][j][k].prefunded)
            }
        }
    }

    console.log(ALLOCATION)
    console.log(PREFUNDS)
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

async function getPrefunds() {
    let query = '{ prefunders (where: {ido:"' + IDO.toLowerCase() + '", active:true}, orderBy:prefunded, orderDirection:desc) { account faction prefunded } }'
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
