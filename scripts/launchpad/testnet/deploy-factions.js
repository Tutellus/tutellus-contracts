const bre = require('hardhat')
const ethers = bre.ethers

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')

const ERC20 = '0x0E06483c44364596e3112390b1105Bb248bc5BCD'
const LP = '0x2e68E5a7fB1B7e1573659194Cf7B28107D96fFa4'

async function main () {
  bre.run('compile')
  const Manager = await ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
  // const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
  const launchpadStakingImp = '0xb6f241Da16972546C320398a28e7E9A48263aC5F'

  const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [ERC20])
  const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [LP])
  
  // NAKAMOTOS
  const response = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response2 = await myManager.deployProxyWithImplementation(NAKAMOTOS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  // VUTERINS
  const response3 = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response4 = await myManager.deployProxyWithImplementation(VUTERINS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  // ALTCOINERS
  const response5 = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
  const response6 = await myManager.deployProxyWithImplementation(ALTCOINERS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

  await Promise.all([
    response.wait(),
    response2.wait(),
    response3.wait(),
    response4.wait(),
    response5.wait(),
    response6.wait()
  ])

  const contracts = await Promise.all([
    myManager.get(NAKAMOTOS_STAKING_ID),
    myManager.get(NAKAMOTOS_FARMING_ID),
    myManager.get(VUTERINS_STAKING_ID),
    myManager.get(VUTERINS_FARMING_ID),
    myManager.get(ALTCOINERS_STAKING_ID),
    myManager.get(ALTCOINERS_FARMING_ID),
  ])

  const [nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming] = contracts

  console.log(nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming)
  
  console.log('hardhat verify --network rinkeby', launchpadStakingImp )
  }

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })