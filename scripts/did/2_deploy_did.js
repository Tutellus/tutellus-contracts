const bre = require('hardhat')
const ethers = bre.ethers

async function main() {
    await bre.run('compile')

    const [sender] = await ethers.getSigners();
    const TutellusDIDFactory = await ethers.getContractFactory('TutellusDIDFactory');
    const TutellusDID = await ethers.getContractFactory('TutellusDID');
    console.log('Attaching factory...');
    let factory = TutellusDIDFactory.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3');
    console.log('Deploying proxy...');
    let initiallizeCalldata = TutellusDID.interface.encodeFunctionData('initialize', [ sender.address ]);
    await factory.createProxy(initiallizeCalldata);
    console.log('Proxy deployed')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });