// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusStakingV2 {

  function autoreward() external view returns (bool);
  
  function token() external view returns (address);

  function balance() external view returns (uint256);

  function minFee() external view returns (uint256);

  function maxFee() external view returns (uint256);

  function accRewardsPerShare() external view returns (uint256);

  function lastUpdate() external view returns (uint);
  
  function feeInterval() external view returns (uint);

  function stakers() external view returns (uint);

  function setFees(uint256 minFee_, uint256 maxFee_) external;

  // Sets fee interval (blocks) for staking
  function setFeeInterval(uint feeInterval_) external; 

  // Deposits tokens for staking
  function deposit(address account, uint256 amount) external;

  function depositAll(address account) external;

  // Withdraws tokens from staking
  function withdraw(uint256 amount) external returns (uint256);

  function withdrawAll() external returns (uint256);

  // Claims rewards
  function claim() external;

  // Toggles autoreward
  function toggleAutoreward() external;

  // Gets current fee for a user
  function getFee(address account) external view returns(uint256);

  // Gets blocks until endInverval
  function getBlocksLeft(address account) external view returns (uint);

  // Gets user pending rewards
  function pendingRewards(address user_) external view returns(uint256);

  function initialize(address token_) external;

  // Gets token gap
  function getTokenGap() external view returns (uint256);

  // Synchronizes balance, transfering the gap to an external account
  function syncBalance(address account) external;

  // Gets user staking balance
  function getUserBalance(address user_) external view returns(uint256);

  function migrate(address to) external returns (bytes memory);

  function emergencyWithdraw() external returns (uint256);

}
