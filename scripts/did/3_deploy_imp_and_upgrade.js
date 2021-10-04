const bre = require('hardhat')
const ethers = bre.ethers

async function main() {
    await bre.run('compile')

    const TutellusDIDV2 = await ethers.getContractFactory('TutellusDIDV2');
    const UpgradeableBeacon = await ethers.getContractFactory('UpgradeableBeacon');

    const BEACON_ADDR = ''

    console.log('Attaching Beacon at: ' + BEACON_ADDR)
    let beacon = UpgradeableBeacon.attach(BEACON_ADDR)

    // Deploy a new implementation
    let implementationV2 = await TutellusDIDV2.deploy();
    console.log('Deployed implementation V2 at: ' + implementationV2.address)
    
    // Upgrade beacon implementation 
    await beacon.upgradeTo(implementationV2.address)
    console.log('Beacon implementation upgraded');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });