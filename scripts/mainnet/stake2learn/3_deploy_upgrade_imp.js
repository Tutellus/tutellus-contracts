const { ethers } = require("hardhat");
const { createTx, sendTx } = require('../../../utils/gnosis');

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0xa5D0A86fBd67166251d33A950c4Beb2683836C24"
const FACTORY_PROXY_ADDR = "0x..." // TODO: Añadir la dirección del proxy de la factory ya desplegado
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main() {
    console.log("========================================")
    console.log("Deploying V2 Implementations")
    console.log("========================================\n")

    // 1. Deploy TutellusStake2LearnV2 (nueva implementación para el beacon)
    console.log("1. Deploying TutellusStake2LearnV2 implementation...")
    const TutellusStake2LearnV2 = await ethers.getContractFactory("TutellusStake2LearnV2")
    const s2lImplementationV2 = await TutellusStake2LearnV2.deploy()
    await s2lImplementationV2.deployed()
    console.log("✅ TutellusStake2LearnV2 deployed at:", s2lImplementationV2.address)
    console.log()

    // 2. Deploy TutellusStake2LearnFactoryV2 (nueva implementación para el proxy de la factory)
    console.log("2. Deploying TutellusStake2LearnFactoryV2 implementation...")
    const TutellusStake2LearnFactoryV2 = await ethers.getContractFactory("TutellusStake2LearnFactoryV2")
    const factoryImplementationV2 = await TutellusStake2LearnFactoryV2.deploy()
    await factoryImplementationV2.deployed()
    console.log("✅ TutellusStake2LearnFactoryV2 deployed at:", factoryImplementationV2.address)
    console.log()

    console.log("========================================")
    console.log("Deployment Summary")
    console.log("========================================")
    console.log("S2L Implementation V2:", s2lImplementationV2.address)
    console.log("Factory Implementation V2:", factoryImplementationV2.address)
    console.log()

    console.log("========================================")
    console.log("Next Steps:")
    console.log("========================================")
    console.log("1. Upgrade the Beacon to use the new S2L implementation:")
    console.log("   - Get the factory proxy and call upgradeByImplementation()")
    console.log("   - New S2L implementation:", s2lImplementationV2.address)
    console.log()
    console.log("2. Upgrade the Factory proxy to use the new Factory implementation:")
    console.log("   - Call upgradeTo() on the factory proxy")
    console.log("   - New Factory implementation:", factoryImplementationV2.address)
    console.log()

    // Opcional: Obtener direcciones relevantes para los siguientes pasos
    if (FACTORY_PROXY_ADDR && FACTORY_PROXY_ADDR !== "0x...") {
        const factoryProxy = await ethers.getContractAt("TutellusStake2LearnFactory", FACTORY_PROXY_ADDR)
        const beaconAddress = await factoryProxy.beacon()
        console.log("Factory Proxy:", FACTORY_PROXY_ADDR)
        console.log("Beacon Address:", beaconAddress)
    } else {
        console.log("⚠️  Please set FACTORY_PROXY_ADDR in the script to get more details")
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
