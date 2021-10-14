// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusRewardsVault {

    function add(address account, uint256[] memory allocation) external;

    function updateAllocation(uint256[] memory allocation) external;

    function released() external view returns (uint256);

    function availableId(address account) external view returns (uint256);

    function releasedRange(uint from, uint to) external view returns (uint256);

    function releasedId(address account) external view returns (uint256);

    function distributeTokens(address account, uint256 amount) external;

    function info(address account) external view;
}
