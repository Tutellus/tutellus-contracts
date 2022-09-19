const bre = require('hardhat');
const ethers = bre.ethers;
const { Contract, utils } = ethers;

const ADDRESS = '0x0fC43aAc971813D095e83F9BccB1DeB25f93A4fd';

const poolABI = [
    'function totalSupply() external view returns (uint256)',
    'function getReserves() external view returns (uint112, uint112, uint32)'
];

async function main () {
  await bre.run('compile');
  const myToken = await ethers.getContractAt('TutellusERC20', '0x12a34a6759c871c4c1e8a0a42cfc97e4d7aaf68d');
  const myStaking = await ethers.getContractAt('TutellusStaking', '0x28Caa843cB577d892A8B6eC3F24Aa682ED22Be68');
  const myFarming = await ethers.getContractAt('TutellusFarming', '0x57eB1b68F2ae0F77bf54F5EE6133bE80d6381d1B');
  const myPool = new Contract('0x5d9AC8993B714df01D079d1B5b0b592e579Ca099', poolABI, ethers.provider);

  const [
    tutBalance,
    stakingBalance,
    farmingBalance,
    totalSupply,
    reserves,
  ] = await Promise.all([
    myToken.balanceOf(ADDRESS),
    myStaking.getUserBalance(ADDRESS),
    myFarming.getUserBalance(ADDRESS),
    myPool.totalSupply(),
    myPool.getReserves(),
  ]);

  const poolRatio = reserves[0].mul(utils.parseEther('1')).div(totalSupply);

  console.log('TUT on wallet:', utils.formatEther(tutBalance.toString()));
  console.log('TUT on staking:', utils.formatEther(stakingBalance.toString()));
  console.log('TUT on farming:', utils.formatEther(farmingBalance.mul(poolRatio).div(utils.parseEther('1')).toString()));

  const total = stakingBalance.add(farmingBalance.mul(poolRatio).div(utils.parseEther('1')));

  console.log(`${ADDRESS}: ${utils.formatEther(total.toString())} -> is ${
    total.gte(utils.parseEther('15000')) ? '' : 'NOT '
  }SuperTutelliano`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
