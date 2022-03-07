const bre = require("hardhat");
const ethers = bre.ethers;

const IDO_USDT = ethers.utils.id("IDO_USDT");

async function main() {
    bre.run("compile");
    const Manager = await ethers.getContractFactory("TutellusManager");
    const ERC20 = await ethers.getContractFactory(
        "Token"
    );
    const myUsdt = await ERC20.deploy("Tutellus IDO USDT", "TUT-USDT")

    const myManager = Manager.attach(
        "0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45"
    );
    const response = await myManager.setId(
        IDO_USDT,
        myUsdt.address
    );
    await response.wait();

    console.log("ERC20: ", myUsdt.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
