const { ethers } = require('hardhat')

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const IDO_USDT_ID = ethers.utils.id("IDO_USDT");
const ENERGY_ID = ethers.utils.id('ENERGY')
const WHITELIST_ID = ethers.utils.id('WHITELIST')
const ENERGY_MULTIPLIER_MANAGER_ID = ethers.utils.id('ENERGY_MULTIPLIER_MANAGER')
const ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE = ethers.utils.id('ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE')
const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const LAUNCHPAD_ADMIN_ROLE = ethers.utils.id('LAUNCHPAD_ADMIN_ROLE')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')

const TUT_ADDRESS = '0x930f169A87545a8c6a3e7934d42d1582c03e1b35'
const LP_ADDRESS = '0xfd5447D667eB6960fA326cfa68b7936f52940cA7'
const MANAGER_ADDRESS = '0x0e75e4D2041287813a693971634400EAe765910C'
const USDT_ADDRESS = '0x790CA413c421f253F9fB89aE8546a594287BB8ee'
const LAUNCHPAD_ADMIN_ROLE_ADDRESS = '0x0000000000000000000000000000000000000000'
const WHITELIST_ADMIN_ROLE_ADDRESS = '0x0000000000000000000000000000000000000000'

async function main () {
    //Factories
    const TutellusEnergy = await ethers.getContractFactory("TutellusEnergy");
    const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
    const FactionManager = await ethers.getContractFactory('TutellusFactionManager')
    const TutellusWhitelist = await ethers.getContractFactory("TutellusWhitelist");
    const TutellusEnergyMultiplierManager = await ethers.getContractFactory("TutellusEnergyMultiplierManager");
    const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
    const TutellusIDOFactory = await ethers.getContractFactory("TutellusIDOFactory");

    //Deploy
    const myManager = await ethers.getContractAt('TutellusManager', MANAGER_ADDRESS)
    const emptyInitializeCalldata = FactionManager.interface.encodeFunctionData('initialize', [])

    //TutellusEnergy
    const energyImplementation = await TutellusEnergy.deploy()
    await energyImplementation.deployed()
    console.log("TutellusEnergy implementation:", energyImplementation.address)
    let response = await myManager.deployProxyWithImplementation(ENERGY_ID, energyImplementation.address, emptyInitializeCalldata)
    await response.wait()
    const energyAddress = await myManager.get(ENERGY_ID)
    console.log("TutellusEnergy:", energyAddress)
    await upgrades.forceImport(energyAddress, TutellusEnergy, { kind: 'uups' })

    //RewardsVaultV2
    response = await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, emptyInitializeCalldata)
    await response.wait()
    const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
    console.log("RewardsVaultV2:", rewardsAddr)
    await upgrades.forceImport(rewardsAddr, RewardsVaultV2, { kind: 'uups' })

    //TutellusWhitelist
    response = await myManager.deploy(WHITELIST_ID, TutellusWhitelist.bytecode, emptyInitializeCalldata)
    await response.wait()
    const whitelistAddr = await myManager.get(WHITELIST_ID)
    console.log("TutellusWhitelist:", whitelistAddr)
    await upgrades.forceImport(whitelistAddr, TutellusWhitelist, { kind: 'uups' })

    //TutellusEnergyMultiplierManager
    response = await myManager.deploy(ENERGY_MULTIPLIER_MANAGER_ID, TutellusEnergyMultiplierManager.bytecode, emptyInitializeCalldata)
    await response.wait()
    const energyMasterAddr = await myManager.get(ENERGY_MULTIPLIER_MANAGER_ID)
    console.log("TutellusEnergyMultiplierManager:", energyMasterAddr)
    await upgrades.forceImport(energyMasterAddr, TutellusEnergyMultiplierManager, { kind: 'uups' })
    const myEnergyManager = TutellusEnergyMultiplierManager.attach(energyMasterAddr)

    //FactionManager
    const myFactionManagerImp = await FactionManager.deploy()
    await myFactionManagerImp.deployed()
    console.log("FactionManager implementation:", myFactionManagerImp.address)
    response = await myManager.deployProxyWithImplementation(FACTION_MANAGER, myFactionManagerImp.address, emptyInitializeCalldata)
    await response.wait()

    //LaunchpadStaking
    const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
    await myLaunchpadStakingImp.deployed()
    console.log("LaunchpadStaking:", myLaunchpadStakingImp.address)
    const launchpadStakingImp = myLaunchpadStakingImp.address
    const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [TUT_ADDRESS])
    const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [LP_ADDRESS])
    // NAKAMOTOS
    response = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    await response.wait()
    response = await myManager.deployProxyWithImplementation(NAKAMOTOS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)
    await response.wait()
    // VUTERINS
    response = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    await response.wait()
    response = await myManager.deployProxyWithImplementation(VUTERINS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)
    await response.wait()
    // ALTCOINERS
    response = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    await response.wait()
    response = await myManager.deployProxyWithImplementation(ALTCOINERS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)
    await response.wait()

    const contracts = await Promise.all([
        myManager.get(FACTION_MANAGER),
        myManager.get(NAKAMOTOS_STAKING_ID),
        myManager.get(VUTERINS_STAKING_ID),
        myManager.get(ALTCOINERS_STAKING_ID),
        myManager.get(NAKAMOTOS_FARMING_ID),
        myManager.get(VUTERINS_FARMING_ID),
        myManager.get(ALTCOINERS_FARMING_ID),
    ])
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

    await upgrades.forceImport(nakamotosStaking, LaunchpadStaking, { kind: 'uups' })
    await upgrades.forceImport(factionManager, FactionManager, { kind: 'uups' })

    const myFactionManager = FactionManager.attach(factionManager)

    //TutellusIDOFactory
    const idoFactoryImp = await TutellusIDOFactory.deploy()
    await idoFactoryImp.deployed()
    response = await myManager.deployProxyWithImplementation(
        LAUNCHPAD_IDO_FACTORY,
        idoFactoryImp.address,
        emptyInitializeCalldata
    );
    await response.wait()
    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    console.log("IDOFactory:", idoFactoryAddr)
    await upgrades.forceImport(idoFactoryAddr, TutellusIDOFactory, { kind: 'uups' })

    console.log('-- DEPLOYED --')

    //Config
    const signers = await ethers.getSigners()
    response = await myManager.setId(IDO_USDT_ID, USDT_ADDRESS);
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersFarming)
    await response.wait()
    response = await myManager.grantRole(LAUNCHPAD_ADMIN_ROLE, LAUNCHPAD_ADMIN_ROLE_ADDRESS)
    await response.wait()
    response = await myManager.grantRole(WHITELIST_ADMIN_ROLE, WHITELIST_ADMIN_ROLE_ADDRESS)
    await response.wait()
    response = await myManager.grantRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, signers[0].address)
    await response.wait()
    response = await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)
    await response.wait()
    response = await myManager.grantRole(FACTIONS_ADMIN_ROLE, signers[0].address)
    await response.wait()

    response = await myEnergyManager.setMultiplierType(vuterinsStaking, 1)
    await response.wait()
    response = await myEnergyManager.setMultiplierType(nakamotosStaking, 1)
    await response.wait()
    response = await myEnergyManager.setMultiplierType(altcoinersStaking, 1)
    await response.wait()
    response = await myEnergyManager.setMultiplierType(nakamotosFarming, 2)
    await response.wait()
    response = await myEnergyManager.setMultiplierType(vuterinsFarming, 2)
    await response.wait()
    response = await myEnergyManager.setMultiplierType(altcoinersFarming, 2)
    await response.wait()
    response = await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
    await response.wait()
    response = await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
    await response.wait()
    response = await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, altcoinersFarming)
    await response.wait()

    console.log('-- CONFIGURED --')

    response = await myManager.renounceRole(FACTIONS_ADMIN_ROLE, signers[0].address)
    await response.wait()
    response = await myManager.renounceRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE, signers[0].address)
    await response.wait()

    console.log('-- END --')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
