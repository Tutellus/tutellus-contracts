// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusLaunchpadStaking {
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function LAUNCHPAD_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function LAUNCHPAD_REWARDS (  ) external view returns ( bytes32 );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function UPGRADER_ROLE (  ) external view returns ( bytes32 );
  function accRewardsPerShare (  ) external view returns ( uint256 );
  function autoreward (  ) external view returns ( bool );
  function balance (  ) external view returns ( uint256 );
  function claim (  ) external;
  function config (  ) external view returns ( address );
  function data ( address ) external view returns ( uint256 amount, uint256 rewardDebt, uint256 notClaimed, uint256 endInterval, uint256 minFee, uint256 maxFee, uint256 feeInterval, uint256 energyDebt );
  function deposit ( address account, uint256 amount ) external;
  function energyMultiplier (  ) external view returns ( uint256 );
  function feeInterval (  ) external view returns ( uint256 );
  function getBlocksLeft ( address account ) external view returns ( uint256 );
  function getFee ( address account ) external view returns ( uint256 );
  function getUserBalance ( address account ) external view returns ( uint256 );
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function implementation (  ) external view returns ( address );
  function initialize ( address tkn ) external;
  function lastUpdate (  ) external view returns ( uint256 );
  function maxFee (  ) external view returns ( uint256 );
  function minFee (  ) external view returns ( uint256 );
  function pause (  ) external;
  function paused (  ) external view returns ( bool );
  function pendingRewards ( address account ) external view returns ( uint256 );
  function setFees ( uint256 minFee_, uint256 maxFee_, uint256 feeInterval_ ) external;
  function stakers (  ) external view returns ( uint256 );
  function toggleAutoreward (  ) external;
  function token (  ) external view returns ( address );
  function unpause (  ) external;
  function updateManager ( address manager ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes calldata data ) external;
  function withdraw ( address account, uint256 amount ) external returns ( uint256 );
}
