const { ethers, upgrades } = require("hardhat");

const contracts = [
    {
        name: "TutellusLaunchpadStaking",
        id: ethers.utils.id("NAKAMOTOS_STAKING")
    },
    {
        name: "TutellusEnergyMultiplierManager",
        id: ethers.utils.id("ENERGY_MULTIPLIER_MANAGER")
    },
    {
        name: "TutellusIDOFactory",
        id: ethers.utils.id("LAUNCHPAD_IDO_FACTORY")
    },
    {
        name: "TutellusRewardsVaultV2",
        id: ethers.utils.id("LAUNCHPAD_REWARDS")
    },
    {
        name: "TutellusEnergy",
        id: ethers.utils.id("ENERGY")
    },
    {
        name: "TutellusFactionManager",
        id: ethers.utils.id("FACTION_MANAGER")
    },
    {
        name: "TutellusWhitelist",
        id: ethers.utils.id("WHITELIST")
    }
]

async function main() {
    const manager = await ethers.getContractAt("TutellusManager", "0x73205567d90A45533879eF39a29920056225eFB2")
    for(let i = 0; i < contracts.length; i++) {
        const Factory = await ethers.getContractFactory(contracts[i].name);
        const address = await manager.get(contracts[i].id)
        const result = await upgrades.forceImport(address, Factory, { kind: 'uups' })
        console.log(contracts[i].name)
        console.log(address)
    }
    
    console.log("Imported")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
