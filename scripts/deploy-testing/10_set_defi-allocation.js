const { parseEther } = require('ethers/lib/utils')
const bre = require('hardhat')
const ethers = bre.ethers

async function main () {
  bre.run('compile');

  const myRewardsVault = await ethers.getContractAt('TutellusRewardsVault', '0x83DEaE10817b53dC340710461Ea5117DcDEc5ba5')

  const allocations = [
    parseEther('20'),
    parseEther('80')
  ];

  console.log('Adding accounts...');
  const response = await myRewardsVault.add("0x28Df74104739654f186253a9BCDA6a6D777fdc63", [parseEther('100'), '0']);
  await response.wait()
  console.log('Accounts added.');
  console.log('Setting allocations...');
  const tx = await myRewardsVault.updateAllocation(allocations);
  await tx.wait();
  console.log('Allocations set.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })