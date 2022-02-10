const bre = require('hardhat')
const ethers = bre.ethers

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')

const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')

async function main () {
  bre.run('compile')
  const Manager = await ethers.getContractFactory('TutellusManager')
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')

  const [nakamotosStaking, nakamotosFarming, vuterinsStaking, vuterinsFarming, altcoinersStaking, altcoinersFarming] = await Promise.all([
    myManager.get(NAKAMOTOS_STAKING_ID),
    myManager.get(NAKAMOTOS_FARMING_ID),
    myManager.get(VUTERINS_STAKING_ID),
    myManager.get(VUTERINS_FARMING_ID),
    myManager.get(ALTCOINERS_STAKING_ID),
    myManager.get(ALTCOINERS_FARMING_ID),
  ])

  console.log('Granting energy minter roles to factions...')
  const response = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
  const response2 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
  const response3 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
  const response4 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
  const response5 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
  const response6 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersFarming)

  await Promise.all([
    response.wait(),
    response2.wait(),
    response3.wait(),
    response4.wait(),
    response5.wait(),
    response6.wait()
  ])
  console.log('Roles granted.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })