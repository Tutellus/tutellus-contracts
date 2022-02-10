const bre = require('hardhat')
const ethers = bre.ethers

const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')

async function main () {
  bre.run('compile')
  const Manager = await ethers.getContractFactory('TutellusManager')
  const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
  const initializeCalldata = RewardsVaultV2.interface.encodeFunctionData('initialize', [])

  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45')
  const response = await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
  await response.wait()
  const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
  const myRewardsVaultV2 = RewardsVaultV2.attach(rewardsAddr)
  const rewardsImp = await myRewardsVaultV2.implementation()

  console.log('hardhat verify --network rinkeby', rewardsAddr, rewardsImp, initializeCalldata)
  console.log('hardhat verify --network rinkeby', rewardsImp)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
