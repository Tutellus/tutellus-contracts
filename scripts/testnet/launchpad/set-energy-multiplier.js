const { parseEther } = require("ethers/lib/utils");
const bre = require("hardhat");
const ethers = bre.ethers;

const MULTIPLIER = parseEther('929.938772404');

async function main() {
    await bre.run("compile");

    const myContract = await ethers.getContractAt('TutellusLaunchpadStaking', '0xac2d1Ab2B4CF0207f68577Db370CdF65acB30221');
    const tx = await myContract.setEnergyMultiplier(MULTIPLIER);
    await tx.wait();
    
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
