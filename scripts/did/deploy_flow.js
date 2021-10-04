const bre = require('hardhat')
const ethers = bre.ethers

const _BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

async function main() {
    await bre.run('compile')

    const [sender] = await ethers.getSigners();
    const TutellusDIDFactory = await ethers.getContractFactory('TutellusDIDFactory');
    const TutellusDID = await ethers.getContractFactory('TutellusDID');
    const TutellusDIDV2 = await ethers.getContractFactory('TutellusDIDV2');
    const UpgradeableBeacon = await ethers.getContractFactory('UpgradeableBeacon');

    // Deploy Factory
    let factory = await TutellusDIDFactory.deploy();
    console.log('Factory deployed at: ' + factory.address);

    // Create and initialize new proxy
    let initiallizeCalldata = TutellusDID.interface.encodeFunctionData('initialize', [ sender.address ]);
    let response = await factory.createProxy(initiallizeCalldata);
    let receipt = await response.wait();
    let events = receipt.events;
    let event = events.find(log => log.event === 'NewDID');
    let proxyAddress = event.args['proxy'];
    console.log('New proxy deployed at: ' + proxyAddress);

    // Check deployed proxy version
    let proxy = TutellusDID.attach(proxyAddress);
    let proxyVersion = await proxy.version();
    console.log('Proxy version: ' + proxyVersion);

    // Attach Beacon
    //let [beaconAddress] = ethers.utils.defaultAbiCoder.decode(['address'], await ethers.provider.getStorageAt(proxyAddress, _BEACON_SLOT));
    let beaconAddress = await factory.beacon();
    console.log('Attaching Beacon at: ' + beaconAddress)
    let beacon = UpgradeableBeacon.attach(beaconAddress)

    // Deploy a new implementation
    let implementationV2 = await TutellusDIDV2.deploy();
    console.log('Deployed implementation V2 at: ' + implementationV2.address)
    
    // Upgrade beacon implementation 
    await beacon.upgradeTo(implementationV2.address)
    console.log('Beacon implementation upgraded');

    // Check prev proxy upgraded version
    let newProxyVersion = await proxy.version();
    console.log('Proxy upgraded version: ' + newProxyVersion);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });