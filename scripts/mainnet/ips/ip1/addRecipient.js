const bre = require('hardhat');
const ethers = bre.ethers;
const { utils, Wallet, provider } = ethers;
const { createTx, sendTx } = require('../../../../utils/gnosis');

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"
const RECIPIENT_ADDRESS = "0x4497d506F55f42887c97851a4f31c68A0b422D55";
const NEW_ALLOCATIONS = [
  utils.parseEther('6.666666666666666666'),
  utils.parseEther('26.666666666666666667'),
  utils.parseEther('66.666666666666666667'),
];
const STAKING_ADDRESS = "0x28caa843cb577d892a8b6ec3f24aa682ed22be68";
const FARMING_ADDRESS = "0x57eb1b68f2ae0f77bf54f5ee6133be80d6381d1b";

async function main () {
  bre.run('compile');

  const checkAmounts = NEW_ALLOCATIONS.reduce((a, b) => a.add(b), utils.parseEther('0'));
  console.log('checkAmounts:', utils.formatEther(checkAmounts.toString()));
  const wallet = new Wallet(process.env.PRIVATE_KEY);

  // Business logic
  const myRewardsVault = await ethers.getContractAt(
    'TutellusRewardsVault',
    utils.getAddress('0xc7963fb87c365f67247f97d329d50b9ec5a374b8'),
  );

  console.log('RewardsVault address:', myRewardsVault.address);

  const [stakingInfo, farmingInfo] = await Promise.all([
    myRewardsVault.info(STAKING_ADDRESS),
    myRewardsVault.info(FARMING_ADDRESS),
  ]);

  const stakingAllocation = stakingInfo.allocation;
  const farmingAllocation = farmingInfo.allocation;

  console.log('Staking allocation:', utils.formatEther(stakingAllocation.toString()), '%');
  console.log('Farming allocation:', utils.formatEther(farmingAllocation.toString()), '%');

  const data = {
    to: myRewardsVault.address,
    data: myRewardsVault.interface.encodeFunctionData('add', [
      RECIPIENT_ADDRESS,
      NEW_ALLOCATIONS,
    ]),
    value: 0,
    operation: 0,
  };

  // console.log(JSON.stringify(data));

  const chainId = provider._network.chainId;
  const txData = await createTx(provider, chainId, SAFE, data, wallet);
  await sendTx(chainId, SAFE, txData);
  console.log('SafeTxHash:', txData.contractTransactionHash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
