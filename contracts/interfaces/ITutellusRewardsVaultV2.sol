// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusRewardsVaultV2 {

    function add(address account, uint256[] memory allocation) external;

    function updateAllocations(uint256[] memory allocations) external;

    function released(address) external view returns (uint256);

    function availableId(address account) external view returns (uint256);

    function releasedId(address account) external view returns (uint256);

    function distribute(address account, uint256 amount) external;

    function distributed(address) external view returns (uint256);

    function allocation(address) external view returns (uint256);

    function rewardPerBlock() external view returns (uint256);
}
