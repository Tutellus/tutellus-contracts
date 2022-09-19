const { ethers } = require('hardhat')

const MS = "0x144884904F833cc0D0e62787b6761A46712C28F4"

async function main() {
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const myManager = await TutellusManager.deploy()
    const response = await myManager.initialize()
    await response.wait()
    console.log('Manager: ', myManager.address)
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const tx = await myManager.grantRole(DEFAULT_ADMIN_ROLE, MS)
    await tx.wait()
    console.log("Granted")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
