const bre = require('hardhat')
const ethers = bre.ethers

async function main() {
    await bre.run('compile')

    const TutellusDIDFactory = await ethers.getContractFactory('TutellusDIDFactory');
    console.log('Deploying factory...');
    let factory = await TutellusDIDFactory.deploy();
    console.log('Factory deployed at: ' + factory.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });