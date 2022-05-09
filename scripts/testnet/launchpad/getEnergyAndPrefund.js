const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ENERGY_ADDR = '0x388F6778660D07578B426607DF6937baEBf9405B'
const IDO_ADDR = '0x6047a1be6ce973449516b708b2897d2e9d15c422'

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gperezalba/launchpad'

const FACTION_TO_NAME = {
    '0xe33b57b9ff16e65a8c081e942bac1ac7295aed81796ec2c3e9aabc459783f2ae': 'NAKAMOTOS',
    '0x771dccb6a31b3e1604e08ac8b9186bf28341bbadf563d1030aefdd5dca42a071': 'VUTERINS',
    '0x7e1ee7b85790db7769a1da3114adec489e4583fc3a62d944b2f861d832e62bc5': 'ALTCOINERS'
}

async function main() {
    const data = await getSubgraphData()
    const totalsByFaction = data.factions
    const totalsByFactionAndIDO = data.factionByIDOs

    const energyContract = await ethers.getContractAt('TutellusEnergy', ENERGY_ADDR)

    for (let i = 0; i < totalsByFaction.length; i++) {
        console.log('Faction', FACTION_TO_NAME[totalsByFaction[i].id])
        const unscaledEnergy = await energyContract.unscale(totalsByFaction[i].energy)
        console.log('Total energy', ethers.utils.formatEther(unscaledEnergy), 'eTUT')
        console.log('Total prefunded', ethers.utils.formatEther(totalsByFaction[i].prefunded), 'USDT')
    }

    for (let j = 0; j < totalsByFactionAndIDO.length; j++) {
        console.log('Faction', FACTION_TO_NAME[totalsByFactionAndIDO[j].faction.id])
        console.log('IDO', totalsByFactionAndIDO[j].ido.id)
        const unscaledEnergy = await energyContract.unscale(totalsByFactionAndIDO[j].energy)
        console.log('Total energy by IDO', ethers.utils.formatEther(unscaledEnergy), 'eTUT')
        console.log('Total prefunded by IDO', ethers.utils.formatEther(totalsByFactionAndIDO[j].prefunded), 'USDT')
    }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

// Note that inside factionByIDOs.ido and factionByIDOs.faction we have access to full entity
async function getSubgraphData() {
    let query = '{ factions { id energy prefunded } factionByIDOs (where:{ido:"' + IDO_ADDR.toLowerCase() + '"}) { id prefunded energy ido { id } faction { id } } }'
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