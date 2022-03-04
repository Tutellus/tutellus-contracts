// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusRewardsVaultV2 {

    event Init(uint _lastUpdate);
    event NewAddress(address account, uint256 allocation);
    event NewAllocation(address account, uint256 allocation);
    event NewRewardPerBlock(uint256 rewardPerBlock);
    event NewDistribution(address sender, address account, uint256 amount);

    function initialize (  ) external;

    function accounts ( uint256 ) external view returns (address);

    function add(address account, uint256[] memory allocation) external;

    function setAllocations(uint256[] memory allocations) external;

    function available(address account) external view returns (uint256);

    function released(address account) external view returns (uint256);

    function distribute(address account, uint256 amount) external;

    function distributed(address) external view returns (uint256);

    function allocation(address) external view returns (uint256);

    function rewardPerBlock() external view returns (uint256);

    function totalAccounts (  ) external view returns (uint256);
}
