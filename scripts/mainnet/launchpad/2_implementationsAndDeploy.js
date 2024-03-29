const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const MANAGER_ADDRESS = "0x73205567d90A45533879eF39a29920056225eFB2"
const TUT_ADDRESS = "0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d"
const LP_ADDRESS = "0x5d9ac8993b714df01d079d1b5b0b592e579ca099"
const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"
const DEPLOYER = "0xd2A0C51a58AC51c3E9C0242BC430a84A42c6B88A"

async function main() {
    const TutellusLaunchpadDeployer = await ethers.getContractFactory("TutellusLaunchpadDeployer");
    const TutellusEnergy = await ethers.getContractFactory("TutellusEnergy");
    const LaunchpadStaking = await ethers.getContractFactory("TutellusLaunchpadStaking")
    const FactionManager = await ethers.getContractFactory("TutellusFactionManager")
    const TutellusWhitelist = await ethers.getContractFactory("TutellusWhitelist");
    const TutellusEnergyMultiplierManager = await ethers.getContractFactory("TutellusEnergyMultiplierManager");
    const RewardsVaultV2 = await ethers.getContractFactory("TutellusRewardsVaultV2")
    const TutellusIDOFactory = await ethers.getContractFactory("TutellusIDOFactory");

    const vaultBytecode = RewardsVaultV2.bytecode
    const emptyInitializeCalldata = FactionManager.interface.encodeFunctionData("initialize", [])
    const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData("initialize", [TUT_ADDRESS, "100000000000000000", "10000000000000000000", "1296000"])
    const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData("initialize", [LP_ADDRESS, 0, 0, 0])
    console.log(emptyInitializeCalldata)
    // const energyImplementation = await TutellusEnergy.deploy()
    // await energyImplementation.deployed()
    // const whitelistImplementation = await TutellusWhitelist.deploy()
    // await whitelistImplementation.deployed()
    // const energyMultiplierImplementation = await TutellusEnergyMultiplierManager.deploy()
    // await energyMultiplierImplementation.deployed()
    // const factionManagerImplementation = await FactionManager.deploy()
    // await factionManagerImplementation.deployed()
    // const stakingImplementation = await LaunchpadStaking.deploy()
    // await stakingImplementation.deployed()
    // const idoFactoryImplementation = await TutellusIDOFactory.deploy()
    // await idoFactoryImplementation.deployed()

    // const deployer = TutellusLaunchpadDeployer.attach(DEPLOYER)

    // const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    // const chainId = ethers.provider._network.chainId;

    // const calldataDeploy = deployer.interface.encodeFunctionData(
    //     "deploy",
    //     [
    //         MANAGER_ADDRESS,
    //         vaultBytecode,
    //         energyImplementation.address,
    //         whitelistImplementation.address,
    //         energyMultiplierImplementation.address,
    //         factionManagerImplementation.address,
    //         stakingImplementation.address,
    //         idoFactoryImplementation.address,
    //         emptyInitializeCalldata,
    //         initializeCalldataStaking,
    //         initializeCalldataFarming
    //     ]
    // )

    // const dataDeploy = {
    //     to: ethers.utils.getAddress(deployer.address),
    //     data: calldataDeploy,
    //     value: 0,
    //     operation: 0,
    // };

    // const txDeploy = await createTx(ethers.provider, chainId, SAFE, dataDeploy, wallet);
    // await sendTx(chainId, SAFE, txDeploy);

    // console.log("Deployed")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
