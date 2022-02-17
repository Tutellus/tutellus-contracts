const bre = require('hardhat')
const ethers = bre.ethers

const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')

const ERC20 = '0x0E06483c44364596e3112390b1105Bb248bc5BCD'
const LP = '0x2e68E5a7fB1B7e1573659194Cf7B28107D96fFa4'

async function main () {
  bre.run('compile')

  const signers = await ethers.getSigners()
  const owner = signers[0].address

  const Manager = await ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
  const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

  // console.log('Deploying Launchpad Staking Implementation...')
  // const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
  // console.log('Deploying Faction Manager Implementation...')
  // const myFactionManagerImp = await FactionManager.deploy()

  // console.log('Extracting addresses...')
  // const launchpadStakingImp = myLaunchpadStakingImp.address
  // const factionManagerImp = myFactionManagerImp.address

  const launchpadStakingImp = '0x637B7De312839D156ec5Cb5081d87b9015AC61a6'
  const factionManagerImp = '0xB6e5DB9A4De69B92eD6B56e6C0070De5F1D778Df'

  console.log('Creating initialization calldata...')
  const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [ERC20])
  const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [LP])
  const initializeCalldata = FactionManager.interface.encodeFunctionData('initialize', [])

  console.log('Deploying Faction Manager Proxy with Implementation...')
  const responseManager = await myManager.deployProxyWithImplementation(FACTION_MANAGER, factionManagerImp, initializeCalldata)
  
  console.log('Deploying Nakamotos Proxies with Implementation...')
  // NAKAMOTOS
  const response = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response2 = await myManager.deployProxyWithImplementation(NAKAMOTOS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  console.log('Deploying Vuterins Proxies with Implementation...')
  // VUTERINS
  const response3 = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response4 = await myManager.deployProxyWithImplementation(VUTERINS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  console.log('Deploying Altcoiners Proxies with Implementation...')
  // ALTCOINERS
  const response5 = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response6 = await myManager.deployProxyWithImplementation(ALTCOINERS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  await Promise.all([
    responseManager.wait(),
    response.wait(),
    response2.wait(),
    response3.wait(),
    response4.wait(),
    response5.wait(),
    response6.wait()
  ])

  console.log('Proxies deployment completed...')

  const contracts = await Promise.all([
    myManager.get(FACTION_MANAGER),
    myManager.get(NAKAMOTOS_STAKING_ID),
    myManager.get(NAKAMOTOS_FARMING_ID),
    myManager.get(VUTERINS_STAKING_ID),
    myManager.get(VUTERINS_FARMING_ID),
    myManager.get(ALTCOINERS_STAKING_ID),
    myManager.get(ALTCOINERS_FARMING_ID),
  ])

  console.log('Deploying Nakamotos Proxies with Implementation...')

  const [factionManager, nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming] = contracts

  console.log(
    'FactionManager:', factionManager,
    '\nNakamotosStaking:', nakamotosStaking,
    '\nNakamotosFarming:', nakamotosFarming,
    '\nVuterinsStaking:', vuterinsStaking,
    '\nVuterinsFarming:', vuterinsFarming,
    '\nAltcoinersStaking:', altcoinersStaking,
    '\nAltcoinersFarming:', altcoinersFarming
  )

  console.log('Granting energy minter roles...')

  const response7 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
  const response8 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
  const response9 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
  const response10 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
  const response11 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
  const response12 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersFarming)

  console.log('Granting faction manager role...')
  const response13 = await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

  console.log('Granting faction admin role...')
  const response14 = await myManager.grantRole(FACTIONS_ADMIN_ROLE, owner)

  await Promise.all([
    response7.wait(),
    response8.wait(),
    response9.wait(),
    response10.wait(),
    response11.wait(),
    response12.wait(),
    response13.wait(),
    response14.wait(),
  ])

  console.log('Roles granted.')
  console.log('Updating factions...')
  const myFactionManager = FactionManager.attach(factionManager)
  const response15 = await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
  const response16 = await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
  const response17 = await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, altcoinersFarming)

  await Promise.all([
    response15.wait(),
    response16.wait(),
    response17.wait(),
  ])

  console.log('Factions updated...')
  
  console.log('hardhat verify --network rinkeby', launchpadStakingImp )
  console.log('hardhat verify --network rinkeby', factionManagerImp )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })