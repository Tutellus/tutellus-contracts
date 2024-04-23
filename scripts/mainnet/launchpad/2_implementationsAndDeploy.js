const { ethers } = require("hardhat")
const { createTx, sendTx } = require('../../../utils/gnosis');

const MANAGER_ADDRESS = "0xa5D0A86fBd67166251d33A950c4Beb2683836C24"
const TUT_ADDRESS = "0x18c7541E6660bA04a19309AeD146ded6afe7B9fF"
const LP_ADDRESS = "0x8d34F5E8B953A01099a30f59dBB42AD2F6FdD619"
const SAFE = "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142"
const DEPLOYER = "0x20F49F05F0e1c2E11259B7916580221AD7b9b14d"

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
    const energyImplementation = await TutellusEnergy.deploy()
    await energyImplementation.deployed()
    const whitelistImplementation = await TutellusWhitelist.deploy()
    await whitelistImplementation.deployed()
    const energyMultiplierImplementation = await TutellusEnergyMultiplierManager.deploy()
    await energyMultiplierImplementation.deployed()
    const factionManagerImplementation = await FactionManager.deploy()
    await factionManagerImplementation.deployed()
    const stakingImplementation = await LaunchpadStaking.deploy()
    await stakingImplementation.deployed()
    const idoFactoryImplementation = await TutellusIDOFactory.deploy()
    await idoFactoryImplementation.deployed()

    const deployer = TutellusLaunchpadDeployer.attach(DEPLOYER)

    // const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    // const chainId = ethers.provider._network.chainId;

    await deployer.deploy(MANAGER_ADDRESS,
        vaultBytecode,
        energyImplementation.address,
        whitelistImplementation.address,
        energyMultiplierImplementation.address,
        factionManagerImplementation.address,
        stakingImplementation.address,
        idoFactoryImplementation.address,
        emptyInitializeCalldata,
        initializeCalldataStaking,
        initializeCalldataFarming
    )

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
