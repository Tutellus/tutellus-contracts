// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "contracts/interfaces/ITutellusERC20.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusRewardsVaultV2.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";

contract TutellusRewardsVaultV2_1 is ITutellusRewardsVaultV2, UUPSUpgradeableByRole {
    bytes32 internal constant _REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");

    mapping(uint256 => address) public accounts;
    mapping(address => uint256) public distributed;
    mapping(address => uint256) public allocation;
    mapping(address => uint256) private _releasedOffset;

    uint256 public rewardPerBlock;
    uint256 public totalAccounts;

    uint256 internal _lastUpdate;
    uint256 internal _lastReleasedOffset;
    uint256 internal _globalOffset;

    /// @inheritdoc ITutellusRewardsVaultV2
    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        _lastUpdate = block.number;
        emit Init(_lastUpdate, _lastReleasedOffset);
    }

    function reinitialize() public reinitializer(2) {
        _lastUpdate = block.number;
        emit Init(_lastUpdate, _lastReleasedOffset);
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function add(address account, uint256[] memory allocations) public onlyRole(_REWARDS_MANAGER_ROLE) {
        accounts[totalAccounts] = account;
        totalAccounts++;
        setAllocations(allocations);
        emit NewAddress(account, allocations[allocations.length - 1]);
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function setRewardPerBlock(uint256 value) public onlyRole(_REWARDS_MANAGER_ROLE) {
        _globalOffset = totalReleased();
        _lastUpdate = block.number;
        rewardPerBlock = value;
        emit NewRewardPerBlock(rewardPerBlock);
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function totalReleased() public view returns (uint256) {
        return _globalOffset + _releasedLastUpdate();
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function setAllocations(uint256[] memory allocations) public onlyRole(_REWARDS_MANAGER_ROLE) {
        require(
            allocations.length == totalAccounts,
            "TutellusRewardsVaultV2: allocation array must have same length as number of accounts"
        );
        uint256 sum = 0;
        uint256 releasedAfterOffset = totalReleased() - _lastReleasedOffset;
        _lastReleasedOffset = totalReleased();
        for (uint256 i = 0; i < totalAccounts; i++) {
            address account = accounts[i];
            _releasedOffset[account] += (releasedAfterOffset * allocation[account]) / 100 ether;
            allocation[account] = allocations[i];
            sum += allocation[account];
            emit NewAllocation(account, allocation[account]);
        }
        require(sum == 100 ether, "TutellusRewardsVaultV2: total allocation must be 100 ether");
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function available(address account) public view returns (uint256) {
        return released(account) - distributed[account];
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function released(address account) public view returns (uint256) {
        uint256 releasedAfterOffset = ((totalReleased() - _lastReleasedOffset) * allocation[account]) / 100 ether;
        return releasedAfterOffset + _releasedOffset[account];
    }

    function _releasedLastUpdate() internal view returns (uint256) {
        return rewardPerBlock * (block.number - _lastUpdate);
    }

    /// @inheritdoc ITutellusRewardsVaultV2
    function distribute(address account, uint256 amount) public {
        require(amount <= available(msg.sender), "TutellusRewardsVaultV2: amount exceeds available");
        distributed[msg.sender] += amount;
        ITutellusERC20 tokenInterface = ITutellusERC20(ITutellusManager(config).get(keccak256("ERC20")));
        tokenInterface.transfer(account, amount);
        emit NewDistribution(msg.sender, account, amount);
    }
}
