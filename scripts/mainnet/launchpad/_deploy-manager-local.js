const { ethers } = require('hardhat')

async function main() {
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const myManager = await TutellusManager.deploy()
    await myManager.initialize()
    console.log('Manager: ', myManager.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
