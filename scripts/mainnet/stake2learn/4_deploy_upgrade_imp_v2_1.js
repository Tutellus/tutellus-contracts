const { ethers } = require("hardhat");

const FACTORY_PROXY_ADDR = "0x..." // TODO: Añadir la dirección del proxy de la factory ya desplegado

async function main() {
    console.log("========================================")
    console.log("Deploying V2_1 Implementation")
    console.log("========================================\n")

    // 1. Deploy TutellusStake2LearnV2_1 (nueva implementación para el beacon)
    console.log("1. Deploying TutellusStake2LearnV2_1 implementation...")
    const TutellusStake2LearnV2_1 = await ethers.getContractFactory("TutellusStake2LearnV2_1")
    const s2lImplementationV2_1 = await TutellusStake2LearnV2_1.deploy()
    await s2lImplementationV2_1.deployed()
    console.log("✅ TutellusStake2LearnV2_1 deployed at:", s2lImplementationV2_1.address)
    console.log("   TREASURY:", await s2lImplementationV2_1.TREASURY())
    console.log("   NEW_TOKEN:", await s2lImplementationV2_1.NEW_TOKEN())
    console.log()

    console.log("========================================")
    console.log("Deployment Summary")
    console.log("========================================")
    console.log("S2L Implementation V2_1:", s2lImplementationV2_1.address)
    console.log()

    console.log("========================================")
    console.log("Next Steps:")
    console.log("========================================")
    console.log("1. TREASURY must approve NEW_TOKEN to each S2L (>= its old token balance)")
    console.log()
    console.log("2. Upgrade the Beacon to use the new S2L implementation:")
    console.log("   - Call upgradeByImplementation() on the factory proxy")
    console.log("   - New S2L implementation:", s2lImplementationV2_1.address)
    console.log()

    // Opcional: Obtener direcciones relevantes para los siguientes pasos
    if (FACTORY_PROXY_ADDR && FACTORY_PROXY_ADDR !== "0x...") {
        const factoryProxy = await ethers.getContractAt("TutellusStake2LearnFactoryV2", FACTORY_PROXY_ADDR)
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
