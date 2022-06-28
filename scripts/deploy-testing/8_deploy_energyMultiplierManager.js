const bre = require("hardhat");
const ethers = bre.ethers;

const ENERGY_MULTIPLIER_MANAGER = ethers.utils.id("ENERGY_MULTIPLIER_MANAGER");
const ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE = ethers.utils.id("ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE");
const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')

async function main() {
    const signers = await ethers.getSigners()
    const Manager = await ethers.getContractFactory("TutellusManager");
    const TutellusEnergyMultiplierManager = await ethers.getContractFactory(
        "TutellusEnergyMultiplierManager"
    );
    const initializeCalldata = TutellusEnergyMultiplierManager.interface.encodeFunctionData(
        "initialize",
        []
    );

    const myManager = Manager.attach(
        "0xF182F7576867D6516C280aacbE99c8230250C153"
    );
    const response = await myManager.deploy(
        ENERGY_MULTIPLIER_MANAGER,
        TutellusEnergyMultiplierManager.bytecode,
        initializeCalldata
    );
    await response.wait();
    const energyManagerAddr = await myManager.get(ENERGY_MULTIPLIER_MANAGER);
    const energyManager = TutellusEnergyMultiplierManager.attach(energyManagerAddr);
    const implementationAddr = await energyManager.implementation();

    console.log(
        "hardhat verify --network goerli",
        energyManagerAddr,
        implementationAddr,
        initializeCalldata
    );
    console.log("hardhat verify --network goerli", implementationAddr);

    // Get UPGRADER_ROLE
    const tx1 = await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, signers[0].address);
    await tx1.wait();
    console.log('Upgrader role granted to', signers[0].address);

    const stakings = [
        NAKAMOTOS_STAKING_ID,
        VUTERINS_STAKING_ID,
        ALTCOINERS_STAKING_ID,
    ];
    const farmings = [
        NAKAMOTOS_FARMING_ID,
        VUTERINS_FARMING_ID,
        ALTCOINERS_FARMING_ID,
    ];

    console.log('Config...');
    for (let i = 0; i < stakings.length; i++) {
        let addr = await myManager.get(stakings[i]);
        let response = await energyManager.setMultiplierType(addr, 1);
        await response.wait()
        addr = await myManager.get(farmings[i]);
        response = await energyManager.setMultiplierType(addr, 2);
        await response.wait()
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
