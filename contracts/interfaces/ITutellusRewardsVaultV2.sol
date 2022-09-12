// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusRewardsVaultV2 {
    /// @notice Emitted when proxy is initialized
    /// @param lastUpdate Block number of the tx
    /// @param lastReleasedOffset Offset for previous releases
    event Init(uint256 lastUpdate, uint256 lastReleasedOffset);

    /// @notice Emitted when a new address to release tokens to is added
    /// @param account New address to release tokens to
    /// @param allocation Allocation assigned for new address
    event NewAddress(address account, uint256 allocation);

    /// @notice Emitted when allocation for an address is setted/updated
    /// @param account Address to set/update allocation
    /// @param allocation New allocation for account
    event NewAllocation(address account, uint256 allocation);

    /// @notice Emitted when the rewardPerBlock is updated
    /// @param rewardPerBlock New rate of released tokens per block
    event NewRewardPerBlock(uint256 rewardPerBlock);

    /// @notice Emitted when released tokens are distributed
    /// @param sender Address of the tx sender
    /// @param account Address of the allocated account to distribute funds
    /// @param amount Amount of tokens distributed
    event NewDistribution(address sender, address account, uint256 amount);

    /// @notice Initialize proxy
    function initialize() external;

    /// @notice Returns allocated addresses by its index
    /// @param index Identificator for accounts in mapping
    /// @return account
    function accounts(uint256 index) external view returns (address);

    /// @notice Include a new account to release tokens to
    /// @param account Address to set/update allocation
    /// @param allocation Array with percentages by allocated account. Sum must be 100 ether
    function add(address account, uint256[] memory allocation) external;

    /// @notice Set/update allocation percentages
    /// @param allocations Array with percentages by allocated account. Sum must be 100 ether
    function setAllocations(uint256[] memory allocations) external;

    /// @notice Amount of tokens available to distribute to an allocated account
    /// @dev Released - distributed
    /// @param account Address of allocated account
    /// @return availableAmount
    function available(address account) external view returns (uint256);

    /// @notice Total amount of tokens released up to some block number
    /// @return totalReleasedAmount
    function totalReleased() external view returns (uint256);

    /// @notice Amount of tokens released to an allocated account
    /// @param account Address of allocated account
    /// @return releasedAmount
    function released(address account) external view returns (uint256);

    /// @notice Claim available tokens to an allocated account
    /// @param account Address of allocated account
    /// @param amount Amount of tokens to distribute
    function distribute(address account, uint256 amount) external;

    /// @notice Amount of tokens distributed to an allocated account
    /// @param account Address of allocated account
    /// @return distributedAmount
    function distributed(address account) external view returns (uint256);

    /// @notice Returns percentage of distribution assigned to an account
    /// @param account Address of allocated account
    /// @return distributionPercentage
    function allocation(address account) external view returns (uint256);

    /// @notice Update amount of tokens released per block
    /// @param value New amount of tokens released per block
    function setRewardPerBlock(uint256 value) external;

    /// @notice Returns amount of tokens released per block
    /// @return rewardPerBlock Amount of tokens released per block
    function rewardPerBlock() external view returns (uint256);

    /// @notice Returns amount of allocated accounts
    /// @return totalAccounts Amount of allocated accounts
    function totalAccounts() external view returns (uint256);
}
