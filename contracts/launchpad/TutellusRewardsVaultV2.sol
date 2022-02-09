// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../interfaces/ITutellusManager.sol";

contract TutellusRewardsVaultV2 is UUPSUpgradeableByRole {

  bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");

  mapping(address=>uint256) public released;
  mapping(address=>uint256) public distributed;
  mapping(address=>uint256) public allocation;
  mapping(uint256=>address) public id;
  
  uint256 public rewardPerBlock;
  uint256 public total;
  uint public lastUpdate;

  event NewAddress(address account, uint256 allocation);
  event NewAllocations(uint256[] allocations);
  event NewRewardPerBlock(uint256 rewardPerBlock);
  event NewDistribution(address sender, address account, uint256 amount);

  modifier update() {
    for(uint256 i=0; i<total; i++) {
      released[id[i]] = releasedId(id[i]);
    }
    lastUpdate = block.number;
    _;
  }

  function initialize() public initializer {
    __AccessControlProxyPausable_init(msg.sender);
    lastUpdate = block.number;
  }

  function add(address account, uint256[] memory allocations) public onlyRole(REWARDS_MANAGER_ROLE) {
    id[total] = account;
    total++;
    setAllocations(allocations);
    emit NewAddress(account, allocations[allocations.length - 1]);
  }

  function setRewardPerBlock(uint256 value) public update onlyRole(REWARDS_MANAGER_ROLE) {
    rewardPerBlock = value;
    emit NewRewardPerBlock(rewardPerBlock);
  }

  function setAllocations(uint256[] memory allocations) public update onlyRole(REWARDS_MANAGER_ROLE) {
    uint256 sum = 0;
    uint256 length = allocations.length;
    require(length == total, "TutellusRewardsVaultV2: allocation array must have same length as number of accounts");
    for(uint256 i=0; i<length; i++) {
      allocation[id[i]] = allocations[i];
      sum+=allocations[i];
    }
    require(sum==1e20, "TutellusRewardsVaultV2: total allocation must be 1e20");
    emit NewAllocations(allocations);
  }

  function availableId(address account) public view returns (uint256) {
    return releasedId(account) - distributed[account];
  }

  function _releasedFromLastUpdate() internal view returns (uint256) {
    uint blocks = block.number - lastUpdate;
    return blocks * rewardPerBlock;
  }

  function releasedId(address account) public view returns (uint256) {
    return released[account] + (_releasedFromLastUpdate() * allocation[account] / 100 ether);
  }

  function distribute(address account, uint256 amount) public {
    require(amount <= availableId(msg.sender), "TutellusRewardsVaultV2: amount exceeds available");
    distributed[account] += amount;
    IERC20 tokenInterface = IERC20(ITutellusManager(config).get(keccak256("ERC20")));
    tokenInterface.transfer(account, amount);
    emit NewDistribution(msg.sender, account, amount);
  }
}
