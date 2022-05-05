const bre = require("hardhat");
const ethers = bre.ethers;

const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");

async function main() {
    bre.run("compile");
    const Manager = await ethers.getContractFactory("TutellusManager");
    const TutellusIDOFactory = await ethers.getContractFactory(
        "TutellusIDOFactory"
    );
    const initializeCalldata = TutellusIDOFactory.interface.encodeFunctionData(
        "initialize",
        []
    );

    const myManager = Manager.attach(
        "0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45"
    );
    const response = await myManager.deploy(
        LAUNCHPAD_IDO_FACTORY,
        TutellusIDOFactory.bytecode,
        initializeCalldata
    );
    await response.wait();
    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    const myIdoFactory = TutellusIDOFactory.attach(idoFactoryAddr);
    const idoFactoryImp = await myIdoFactory.implementation();

    console.log(
        "hardhat verify --network rinkeby",
        idoFactoryAddr,
        idoFactoryImp,
        initializeCalldata
    );
    console.log("hardhat verify --network rinkeby", idoFactoryImp);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
