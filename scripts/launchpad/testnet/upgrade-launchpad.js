const bre = require('hardhat')
const ethers = bre.ethers

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')

const UPGRADER_ROLE = ethers.utils.id('UPGRADER_ROLE')

const upgradeContract = async ({
  manager,
  id,
  implementation
}) => {
  const addr = await manager.get(id);
  const contract = await ethers.getContractAt('UUPSUpgradeableByRole', addr);
  const tx2 = await contract.upgradeTo(implementation);
  await tx2.wait()
}

async function main () {
  bre.run('compile');

  const signers = await ethers.getSigners();
  const owner = signers[0].address;

  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');
  const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking');
  const FactionManager = await ethers.getContractFactory('TutellusFactionManager');

  console.log('Deploying Launchpad Staking Implementation...');
  const myLaunchpadStakingImp = await LaunchpadStaking.deploy();
  console.log('Deploying Faction Manager Implementation...');
  const myFactionManagerImp = await FactionManager.deploy();

  await Promise.all([
    myLaunchpadStakingImp.deployTransaction.wait(),
    myFactionManagerImp.deployTransaction.wait(),
  ]);
  
  const launchpadStakingImp = myLaunchpadStakingImp.address;
  const factionManagerImp = myFactionManagerImp.address;

  console.log('LaunchpadStaking Implementation:', launchpadStakingImp);
  console.log('FactionManager Implementation:', factionManagerImp);

  console.log('hardhat verify --network rinkeby', launchpadStakingImp);
  console.log('hardhat verify --network rinkeby', factionManagerImp);

  // Get UPGRADER_ROLE
  const tx1 = await myManager.grantRole(UPGRADER_ROLE, owner);
  await tx1.wait();
  console.log('Upgrader role granted to', owner);

  // Upgrade faction
  await upgradeContract({
    manager: myManager,
    id: FACTION_MANAGER,
    implementation: factionManagerImp,
  })
  console.log('FactionManager upgraded.');

  // Upgrade stakings
  const ids = [
    NAKAMOTOS_STAKING_ID,
    NAKAMOTOS_FARMING_ID,
    VUTERINS_STAKING_ID,
    VUTERINS_FARMING_ID,
    ALTCOINERS_STAKING_ID,
    ALTCOINERS_FARMING_ID,
  ];

  console.log('Upgrading stakings...')
  for (let i=0; i < ids.length; i++) {
    const id = ids[i];
    await upgradeContract({
      manager: myManager,
      id,
      implementation: launchpadStakingImp,
    });
  }  
  console.log('Stakings upgraded.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })