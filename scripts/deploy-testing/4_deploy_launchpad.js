const { ethers } = require('hardhat')
const bre = require('hardhat')

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const IDO_USDT = ethers.utils.id("IDO_USDT");
const ENERGY_AUX_ID = ethers.utils.id('ENERGY_AUX')
const ENERGY_ID = ethers.utils.id('ENERGY')
const ERC20_ID = ethers.utils.id('ERC20')
const WHITELIST_ID = ethers.utils.id('WHITELIST')
const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const LAUNCHPAD_ADMIN_ROLE = ethers.utils.id('LAUNCHPAD_ADMIN_ROLE')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')

const TUT_ADDRESS = '0x7F42C954DffaB4dddfdF3dDE8238d9840671B4a8'
const LP_ADDRESS = '0x1b4b44f875bBD8F5E3424A97237a0eB9dab3Cf8C'
const MANAGER_ADDRESS = '0x06223cb5CB01191521e07a2e65dD1E0430E0705b'

async function main () {
    const signers = await ethers.getSigners()

    // Deploy stuff
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const TutellusERC20 = await ethers.getContractFactory("TutellusERC20");
    const TutellusEnergy = await ethers.getContractFactory("TutellusEnergy");
    const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
    const FactionManager = await ethers.getContractFactory('TutellusFactionManager')
    const TutellusWhitelist = await ethers.getContractFactory("TutellusWhitelist");
    const Token = await ethers.getContractFactory("Token");

    const myManager = await ethers.getContractAt('TutellusManager', MANAGER_ADDRESS)
    const initializeCalldata = FactionManager.interface.encodeFunctionData('initialize', [])
    const energyImp = await TutellusEnergy.deploy()
    await energyImp.deployed()
    const resp4 = await myManager.deployProxyWithImplementation(ENERGY_ID, energyImp.address, initializeCalldata)
    await resp4.wait()
    const energyAddr = await myManager.get(ENERGY_ID)
    console.log("eTUT: ", energyAddr)

    const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
    const resp30 = await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
    await resp30.wait()
    const resp300 = await myManager.deploy(WHITELIST_ID, TutellusWhitelist.bytecode, initializeCalldata)
    await resp300.wait()
    const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
    const whitelistAddr = await myManager.get(WHITELIST_ID)
    const myTUT = await ethers.getContractAt('Token', TUT_ADDRESS)
    await myTUT.mint(rewardsAddr, ethers.utils.parseEther('50000'))

    console.log(
        "RewardsVaultV2: ",
        rewardsAddr
    );

    console.log(
        "Whitelist: ",
        whitelistAddr
    );

    const myUsdt = await Token.deploy("Tutellus IDO USDT", "TUT-USDT")
    await myUsdt.deployed()
    await myUsdt.mint(signers[0].address, ethers.utils.parseEther('10000000'))

    console.log(
        "USDT: ",
        myUsdt.address
    );

    const resp19 = await myManager.setId(
        IDO_USDT,
        myUsdt.address
    );
    await resp19.wait()

    console.log('Deploying Launchpad Staking Implementation...')
    const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
    console.log('Deploying Faction Manager Implementation...')
    const myFactionManagerImp = await FactionManager.deploy()
    await myFactionManagerImp.deployed()

    console.log('Extracting addresses...')
    const launchpadStakingImp = myLaunchpadStakingImp.address
    const factionManagerImp = myFactionManagerImp.address

    console.log('Creating initialization calldata...')
    const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [myTUT.address])
    const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [LP_ADDRESS])

    console.log('Deploying Faction Manager Proxy with Implementation...')
    const resp7 = await myManager.deployProxyWithImplementation(FACTION_MANAGER, factionManagerImp, initializeCalldata)

    console.log('Deploying Nakamotos Proxies with Implementation...')
    // NAKAMOTOS
    const resp8 = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp8b = await myManager.deployProxyWithImplementation(NAKAMOTOS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    console.log('Deploying Vuterins Proxies with Implementation...')
    // VUTERINS
    const resp9 = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp9b = await myManager.deployProxyWithImplementation(VUTERINS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    console.log('Deploying Altcoiners Proxies with Implementation...')
    // ALTCOINERS
    const resp10 = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp10b = await myManager.deployProxyWithImplementation(ALTCOINERS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    await Promise.all([
        resp7.wait(),
        resp8.wait(),
        resp9.wait(),
        resp10.wait(),
        resp8b.wait(),
        resp9b.wait(),
        resp10b.wait()
    ])

    console.log('Proxies deployment completed...')

    const contracts = await Promise.all([
        myManager.get(FACTION_MANAGER),
        myManager.get(NAKAMOTOS_STAKING_ID),
        myManager.get(VUTERINS_STAKING_ID),
        myManager.get(ALTCOINERS_STAKING_ID),
        myManager.get(NAKAMOTOS_FARMING_ID),
        myManager.get(VUTERINS_FARMING_ID),
        myManager.get(ALTCOINERS_FARMING_ID),
    ])

    console.log('Deploying Nakamotos Proxies with Implementation...')

    const [factionManager, nakamotosStaking, vuterinsStaking, altcoinersStaking, nakamotosFarming, vuterinsFarming, altcoinersFarming] = contracts

    console.log(
        'FactionManager:', factionManager,
        '\nNakamotosStaking:', nakamotosStaking,
        '\nVuterinsStaking:', vuterinsStaking,
        '\nAltcoinersStaking:', altcoinersStaking,
        '\nNakamotosFarming:', nakamotosFarming,
        '\nVuterinsFarming:', vuterinsFarming,
        '\nAltcoinersFarming:', altcoinersFarming,
    )

    const myFactionManager = FactionManager.attach(factionManager)

    console.log('Granting energy minter roles...')

    const resp11 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
    const resp12 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
    const resp13 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
    const resp110 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
    const resp120 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
    const resp130 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersFarming)
    const resp131 = await myManager.grantRole(LAUNCHPAD_ADMIN_ROLE, signers[0].address)
    const resp132 = await myManager.grantRole(WHITELIST_ADMIN_ROLE, signers[0].address)

    console.log('Setting energy multipliers...')

    const stakings = [nakamotosStaking, vuterinsStaking, altcoinersStaking]
    const farmings = [nakamotosFarming, vuterinsFarming, altcoinersFarming]

    for (let i = 0; i < stakings.length; i++) {
        const myContract = await ethers.getContractAt('TutellusLaunchpadStaking', stakings[i]);
        const tx = await myContract.setEnergyMultiplier(ethers.utils.parseEther('2'));
        await tx.wait();
    }

    for (let i = 0; i < farmings.length; i++) {
        const myContract = await ethers.getContractAt('TutellusLaunchpadStaking', farmings[i]);
        const tx = await myContract.setEnergyMultiplier(ethers.utils.parseEther('929.938772404'));
        await tx.wait();
    }

    console.log('Granting faction manager role...')
    const resp14 = await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

    console.log('Granting faction admin role...')
    const resp15 = await myManager.grantRole(FACTIONS_ADMIN_ROLE, signers[0].address)

    await Promise.all([
        resp11.wait(),
        resp12.wait(),
        resp13.wait(),
        resp110.wait(),
        resp120.wait(),
        resp130.wait(),
        resp131.wait(),
        resp132.wait(),
        resp14.wait(),
        resp15.wait(),
    ])

    console.log('Roles granted.')
    console.log('Updating factions...')
    const resp16 = await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
    const resp17 = await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
    const resp18 = await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, altcoinersFarming)

    await Promise.all([
        resp16.wait(),
        resp17.wait(),
        resp18.wait(),
    ])

    console.log('Factions updated...')

    const TutellusIDOFactory = await ethers.getContractFactory(
        "TutellusIDOFactory"
    );
    const idoFactoryImp = await TutellusIDOFactory.deploy()
    await idoFactoryImp.deployed()
    const resp20 = await myManager.deployProxyWithImplementation(
        LAUNCHPAD_IDO_FACTORY,
        idoFactoryImp.address,
        initializeCalldata
    );

    await resp20.wait()

    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    console.log("IDOFactory: ", idoFactoryAddr)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
