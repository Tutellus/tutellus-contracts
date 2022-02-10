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
  const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
  const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [ERC20])
  const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [LP])
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')

  // NAKAMOTOS
  const response = await myManager.deploy(NAKAMOTOS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldataStaking)
  const response2 = await myManager.deploy(NAKAMOTOS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldataFarming)

  // VUTERINS
  const response3 = await myManager.deploy(VUTERINS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldataStaking)
  const response4 = await myManager.deploy(VUTERINS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldataFarming)

  // ALTCOINERS
  const response5 = await myManager.deploy(ALTCOINERS_STAKING_ID, LaunchpadStaking.bytecode, initializeCalldataStaking)
  const response6 = await myManager.deploy(ALTCOINERS_FARMING_ID, LaunchpadStaking.bytecode, initializeCalldataFarming)

  await Promise.all([
    response.wait(),
    response2.wait(),
    response3.wait(),
    response4.wait(),
    response5.wait(),
    response6.wait()
  ])

  const [nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming] = await Promise.all([
    myManager.get(NAKAMOTOS_STAKING_ID),
    myManager.get(NAKAMOTOS_FARMING_ID),
    myManager.get(VUTERINS_STAKING_ID),
    myManager.get(VUTERINS_FARMING_ID),
    myManager.get(ALTCOINERS_STAKING_ID),
    myManager.get(ALTCOINERS_FARMING_ID),
  ])

  const implementation = await LaunchpadStaking.attach(nakamotosStaking).implementation()

  console.log('hardhat verify --network rinkeby', implementation)
  console.log(nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })