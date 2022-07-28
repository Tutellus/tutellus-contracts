const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const FACTION_TO_NAME = {
    "0xe33b57b9ff16e65a8c081e942bac1ac7295aed81796ec2c3e9aabc459783f2ae":
        "NAKAMOTOS",
    "0x771dccb6a31b3e1604e08ac8b9186bf28341bbadf563d1030aefdd5dca42a071":
        "VUTERINS",
    "0x7e1ee7b85790db7769a1da3114adec489e4583fc3a62d944b2f861d832e62bc5":
        "ALTCOINERS",
};

const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/gperezalba/launchpad-goerli";
const ENERGY_ADDR = "0xd0977Cce3094772297ACB21c41cd44752D7768Ed";
const IDO_ADDR = ethers.constants.AddressZero; //'0x046Ac4a1fCAA576c2850Cd7D3b1268A11e97fF8C'

async function main() {
    const energyContract = await ethers.getContractAt(
        "TutellusEnergy",
        ENERGY_ADDR
    );
    const obj = {};
    let data;

    if (IDO_ADDR === ethers.constants.AddressZero) {
        data = (await getSubgraphDataGeneral()).factions;
    } else {
        data = (await getSubgraphDataByIdo()).factionByIDOs;
    }

    for (let i = 0; i < data.length; i++) {
        const results = {};
        const unscaledEnergy = await energyContract.unscale(data[i].energy);
        results["energy"] = ethers.utils.formatEther(unscaledEnergy);
        results["usd"] = ethers.utils.formatEther(data[i].prefunded);
        results["users"] = data[i].nPrefunders;

        let factionId =
            IDO_ADDR !== ethers.constants.AddressZero
                ? data[i].faction.id
                : data[i].id;
        obj[FACTION_TO_NAME[factionId]] = results;
    }

    console.log(obj);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

async function getSubgraphDataGeneral() {
    let query = "{ factions { id energy prefunded nPrefunders } }";
    return await querySubgraph(query);
}

async function getSubgraphDataByIdo() {
    let query =
        '{ factionByIDOs (where:{ido:"' +
        IDO_ADDR.toLowerCase() +
        '"}) { id prefunded energy nPrefunders ido { id } faction { id } } }';
    return await querySubgraph(query);
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
