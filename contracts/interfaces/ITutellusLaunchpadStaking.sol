// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusLaunchpadStaking {
    /// @notice Emitted when proxy contract is initialized
    /// @param lastUpdate Deploy block number
    /// @param token Address of the ERC20 token to handle
    event Init(uint256 lastUpdate, address token);

    /// @notice Emitted when claiming rewards for an account
    /// @dev Claimable for third parties
    /// @param account Address rewarded
    event Claim(address account);

    /// @notice Emitted when an account desposits an amount of token
    /// @param account Address of the staker
    /// @param amount Amount of token to deposit
    /// @param energyMinted Amount of energy token minted (dervied from amount)
    event Deposit(address account, uint256 amount, uint256 energyMinted);

    /// @notice Emitted when an account withdraws deposited amount of token
    /// @param account Address of the staker
    /// @param amount Amount of token to withdraw
    /// @param burned Amount of token burnt as fee
    /// @param energyBurned Amount of energy token burnt (derived from amount)
    event Withdraw(
        address account,
        uint256 amount,
        uint256 burned,
        uint256 energyBurned
    );

    /// @notice Emitted when rewards of account are claimed
    /// @param account Address of the staker
    /// @param amount Amount of token distributed as reward
    event Rewards(address account, uint256 amount);

    /// @notice Emitted when autoreward is updated
    /// @dev Updated to !autoreward
    /// @param autoreward Indicates if autoreward when deposit/withdraw is active
    event ToggleAutoreward(bool autoreward);

    /// @notice Emitted when stored general data is updated
    /// @dev Updated when deposit, withdraw and claim
    /// @param balance Total deposited amount
    /// @param accRewardsPerShare Released per unit of token deposited
    /// @param lastUpdate Block number of last update
    /// @param stakers Number of current stakers
    event Update(
        uint256 balance,
        uint256 accRewardsPerShare,
        uint256 lastUpdate,
        uint256 stakers
    );

    /// @notice Emitted when stored data of staker is updated
    /// @param account Address of staker
    /// @param amount Staker deposited amount
    /// @param rewardDebt accRewardsPerShare of staker
    /// @param notClaimed Amount available to claim
    /// @param endInterval End interval for fee
    event UpdateData(
        address account,
        uint256 amount,
        uint256 rewardDebt,
        uint256 notClaimed,
        uint256 endInterval
    );

    /// @notice Emitted when fee configuration is updated
    /// @param minFee Fee after endInterval
    /// @param maxFee Fee in deposit block number
    /// @param feeInterval Amount of blocks to get minFee when withdraw
    event SetFees(uint256 minFee, uint256 maxFee, uint256 feeInterval);

    /// @notice Released per unit of token deposited
    function accRewardsPerShare() external view returns (uint256);

    /// @notice Indicates if autoreward when deposit/withdraw is active
    function autoreward() external view returns (bool);

    /// @notice Total deposited amount
    function balance() external view returns (uint256);

    /// @notice Get released tokens as reward of staking
    /// @dev Claimable for third parties
    /// @param account Address of staker
    function claim(address account) external;

    /// @notice Returns stored info about staker
    /// @param account Address of the staker
    /// @return amount Staker deposited amount
    /// @return rewardDebt accRewardsPerShare of staker
    /// @return notClaimed Amount available to claim
    /// @return endInterval End interval for fee
    /// @return minFee Fee after endInterval
    /// @return maxFee Fee in deposit block number
    /// @return feeInterval Amount of blocks to get minFee when withdraw
    /// @return energyDebt Scaled amount of energy
    function data(address account)
        external
        view
        returns (
            uint256 amount,
            uint256 rewardDebt,
            uint256 notClaimed,
            uint256 endInterval,
            uint256 minFee,
            uint256 maxFee,
            uint256 feeInterval,
            uint256 energyDebt
        );

    /// @notice Stake amount of token for staker with address account
    /// @param account Address of the staker
    /// @param amount Amount of token to stake
    function deposit(address account, uint256 amount)
        external
        returns (uint256);

    /// @notice Returns energy multiplier of this contract
    function getEnergyMultiplier() external view returns (uint256);

    /// @notice Returns number of blocks to reach minFee
    function feeInterval() external view returns (uint256);

    /// @notice Returns nomber of blocks until account's endInterval
    /// @param account Address of the staker
    function getBlocksLeft(address account) external view returns (uint256);

    /// @notice Returns fee to withdraw of account
    /// @param account Address of the staker
    function getFee(address account) external view returns (uint256);

    /// @notice Returns deposited amount of account
    /// @param account Address of the staker
    function getUserBalance(address account) external view returns (uint256);

    /// @notice Initializes proxy
    /// @param tkn Address of token to handle
    /// @param minFee Fee after endInterval
    /// @param maxFee Fee in deposit block number
    /// @param feeInterval Amount of blocks to get minFee when withdraw
    function initialize(address tkn, uint minFee, uint maxFee, uint feeInterval) external;

    /// @notice Block number of last update
    function lastUpdate() external view returns (uint256);

    /// @notice Returns fee to withdraw in the same block as deposit
    function maxFee() external view returns (uint256);

    /// @notice Returns fee to withdraw after endInterval
    function minFee() external view returns (uint256);

    /// @notice Returns rewards available to claim for account
    /// @param account Address of the staker
    function pendingRewards(address account) external view returns (uint256);

    /// @notice Update configuration of fees to withdraw
    /// @param minFee Fee after endInterval
    /// @param maxFee Fee in deposit block number
    /// @param feeInterval Amount of blocks to get minFee when withdraw
    function setFees(
        uint256 minFee,
        uint256 maxFee,
        uint256 feeInterval
    ) external;

    /// @notice Returns current number of stakers
    function stakers() external view returns (uint256);

    /// @notice Emitted when autoreward is updated
    /// @dev Updated to !autoreward
    function toggleAutoreward() external;

    /// @notice Address of the token handled by the contract
    function token() external view returns (address);

    /// @notice Withdraw deposited amount of token
    /// @param account Address of the staker
    /// @param amount Amount of token to withdraw
    function withdraw(address account, uint256 amount)
        external
        returns (uint256, uint256);
}
