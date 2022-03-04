// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../interfaces/ITutellusERC20.sol';
import '../interfaces/ITutellusManager.sol';
import '../interfaces/ITutellusRewardsVaultV2.sol';
import '../utils/UUPSUpgradeableByRole.sol';

contract TutellusRewardsVaultV2 is ITutellusRewardsVaultV2, UUPSUpgradeableByRole {

  bytes32 public constant _REWARDS_MANAGER_ROLE = keccak256('REWARDS_MANAGER_ROLE');

  mapping(address=>uint256) internal _releasedOffsetOf;
  mapping(address=>uint256) public distributed;
  mapping(address=>uint256) public allocation;
  
  address[] internal _accounts;
  uint256 internal _lastUpdate;
  uint256 public rewardPerBlock;
  
  function initialize() public initializer {
    __AccessControlProxyPausable_init(msg.sender);
    _lastUpdate = block.number;
    emit Init(_lastUpdate);
  }

  function add(address account, uint256[] memory allocations) public onlyRole(_REWARDS_MANAGER_ROLE) {
    _accounts.push(account);
    setAllocations(allocations);
    emit NewAddress(account, allocations[allocations.length - 1]);
  }

  function setRewardPerBlock(uint256 value) public onlyRole(_REWARDS_MANAGER_ROLE) {
    for(uint256 i=0; i < _accounts.length; i++) {
      address account = _accounts[i];
      _releasedOffsetOf[account] = released(account);
    }
    _lastUpdate = block.number;
    rewardPerBlock = value;
    emit NewRewardPerBlock(rewardPerBlock);
  }

  function setAllocations(uint256[] memory allocations) public onlyRole(_REWARDS_MANAGER_ROLE) {
    require(allocations.length == _accounts.length, 'TutellusRewardsVaultV2: allocation array must have same length as number of accounts');
    uint256 sum = 0;
    for(uint256 i=0; i < _accounts.length; i++) {
      address account = _accounts[i];
      _releasedOffsetOf[account] = released(account);
      allocation[account] = allocations[i];
      sum += allocation[account];
      emit NewAllocation(account, allocation[account]);
    }
    _lastUpdate = block.number;
    require(sum == 100 ether, 'TutellusRewardsVaultV2: total allocation must be 100 ether');
  }

  function available(address account) public view returns (uint256) {
    return released(account) - distributed[account];
  }

  function released(address account) public view returns (uint256) {
    return _releasedOffsetOf[account] + (_releasedLastUpdate() * allocation[account] / 100 ether);
  }

  function _releasedLastUpdate() internal view returns (uint256) {
    return rewardPerBlock * (block.number - _lastUpdate);
  }

  function distribute(address account, uint256 amount) public {
    require(amount <= available(msg.sender), 'TutellusRewardsVaultV2: amount exceeds available');
    distributed[msg.sender] += amount;
    ITutellusERC20 tokenInterface = ITutellusERC20(ITutellusManager(config).get(keccak256('ERC20')));
    tokenInterface.transfer(account, amount);
    emit NewDistribution(msg.sender, account, amount);
  }
}
