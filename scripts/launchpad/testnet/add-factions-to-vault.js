const { parseEther } = require('ethers/lib/utils')
const bre = require('hardhat')
const ethers = bre.ethers

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')

const addAccount = async ({
  myRewardsVault,
  addr,
}) => {
  const accounts = (await myRewardsVault.totalAccounts()).toNumber();
  const allocations = [parseEther('100')];
  for (let i=0; i < accounts; i++) {
    allocations.push(parseEther('0'));
  }
  console.log('Adding', addr, 'with', allocations);
  const tx = await myRewardsVault.add(addr, allocations);
  await tx.wait();
}

async function main () {
  bre.run('compile');

  const Manager = await ethers.getContractFactory('TutellusManager');
  const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2');
  const myManager = Manager.attach('0x9b77Cb09d5E61D44fEf00e59Cfcc8Af67DAe9A45');
  const myRewardsVault = RewardsVaultV2.attach('0x77d94462BEBe632355C25E30DEb27DfD748901EF');

  const ids = [
    NAKAMOTOS_STAKING_ID,
    NAKAMOTOS_FARMING_ID,
    VUTERINS_STAKING_ID,
    VUTERINS_FARMING_ID,
    ALTCOINERS_STAKING_ID,
    ALTCOINERS_FARMING_ID,
  ];

  const allocations = [
    parseEther('10'),
    parseEther('10'),
    parseEther('10'),
    parseEther('23.333333333333333334'),
    parseEther('23.333333333333333333'),
    parseEther('23.333333333333333333'),
  ];

  console.log('Adding accounts...');
  for (let i=0; i < ids.length; i++) {
    const addr = await myManager.get(ids[i]);
    await addAccount({
      myRewardsVault,
      addr,
    });
  }
  console.log('Accounts added.');
  console.log('Setting allocations...');
  const tx = await myRewardsVault.setAllocations(allocations);
  await tx.wait();
  console.log('Allocations set.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })