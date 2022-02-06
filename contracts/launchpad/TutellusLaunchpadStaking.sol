// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/ITutellusERC20.sol";
import "../interfaces/ITutellusRewardsVaultV2.sol";
import "../interfaces/ITutellusManager.sol";

contract TutellusLaunchpadStaking {

  bool public autoreward;

  address public token;

  uint256 public balance;
  uint256 public minFee;
  uint256 public maxFee;
  uint256 public accRewardsPerShare;

  uint256 internal _released;

  uint public lastUpdate;
  uint public feeInterval;
  uint public stakers;

  address public faction;

  struct Data {
    uint256 amount;
    uint256 rewardDebt;
    uint256 notClaimed;
    uint endInterval;
    uint256 minFee;
    uint256 maxFee;
    uint256 feeInterval;
  }

  mapping(address=>Data) private data;

  event Claim(address account);
  event Deposit(address account, uint256 amount);
  event Withdraw(address account, uint256 amount, uint256 burned);
  event Rewards(address account, uint256 amount);

  event SyncBalance(address account, uint256 amount);
  event ToggleAutoreward(bool autoreward);
  event Update(uint256 balance, uint256 accRewardsPerShare, uint lastUpdate, uint stakers);
  event UpdateData(address account, uint256 amount, uint256 rewardDebt, uint256 notClaimed, uint endInterval);
  event SetFees(uint256 minFee, uint256 maxFee, uint feeInterval);
  event Migrate(address from, address to, address account, uint256 amount, bytes response);

  constructor (address token_) {
    // __AccessControlProxyPausable_init(msg.sender);
    // minFee = 1e17;
    // maxFee = 1e19;
    // feeInterval = 1296000;
    autoreward = true;
    lastUpdate = block.number;
    token = token_;
    faction = msg.sender;
  }

  modifier onlyFaction {
    require(msg.sender == faction, 'TutellusLaunchpadStaking: only faction');
    _;
  }

  modifier update() {
    require(token != address(0), "TutellusStaking: token must be set");
    ITutellusRewardsVaultV2 rewardsInterface = ITutellusRewardsVaultV2(ITutellusManager(config).get(keccak256("REWARDS")));
    uint256 released = rewardsInterface.released(address(this)) - _released;
    _released += released;
    if(balance > 0) {
      accRewardsPerShare += (released * 1 ether / balance);
    }
    lastUpdate = block.number;
    _;
  }

  // Updates rewards for an account
  function _updateRewards(address account) internal {
    Data storage user = data[account];
    uint256 diff = accRewardsPerShare - user.rewardDebt;
    user.notClaimed += diff * user.amount / 1 ether;
    user.rewardDebt = accRewardsPerShare;
  }

  // Sets maximum and minimum fees, and fees interval
  function setFees(uint256 minFee_, uint256 maxFee_, uint feeInterval_) public onlyFaction {
    require(minFee_ <= maxFee_, "TutellusLaunchpadStaking: mininum fee must be greater or equal than maximum fee");
    require(minFee_ <= 1e20, "TutellusLaunchpadStaking: minFee cannot exceed 100 ether");
    require(maxFee_ <= 1e20, "TutellusLaunchpadStaking: maxFee cannot exceed 100 ether");
    minFee = minFee_;
    maxFee = maxFee_;
    feeInterval = feeInterval_;
    emit SetFees(minFee, maxFee, feeInterval);
  }

  // Deposits tokens for staking
  function deposit(address account, uint256 amount) public onlyFaction update {
    require(amount > 0, "TutellusLaunchpadStaking: amount must be over zero");

    ITutellusERC20 tokenInterface = ITutellusERC20(token);

    require(tokenInterface.allowance(account, address(this)) >= amount, "TutellusLaunchpadStaking: amount exceeds allowance");
    require(tokenInterface.balanceOf(account) >= amount, "TutellusLaunchpadStaking: amount exceeds balance");

    Data storage user = data[account];

    _updateRewards(account);

    if(user.amount == 0) {
      stakers += 1;
    }

    user.endInterval = block.number + feeInterval;
    user.minFee = minFee;
    user.maxFee = maxFee;
    user.feeInterval = feeInterval;
    user.amount += amount;
    balance += amount;
    
    if(autoreward) {
      _reward(account);
    }

    tokenInterface.transferFrom(account, address(this), amount);

    emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
    emit UpdateData(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
    emit Deposit(account, amount);
  }

  // Withdraws tokens from staking
  function withdraw(address account, uint256 amount) public onlyFaction update returns (uint256) {
    require(amount > 0, "TutellusLaunchpadStaking: amount must be over zero");

    Data storage user = data[account];

    require(amount <= user.amount, "TutellusLaunchpadStaking: user has not enough staking balance");

    _updateRewards(account);

    user.rewardDebt = accRewardsPerShare;
    user.amount -= amount;
    balance -= amount;

    if(user.amount == 0) {
      stakers -= 1;
    }

    ITutellusERC20 tokenInterface = ITutellusERC20(token);

    uint256 burned = amount * getFee(account) / 1e20;
    amount -= burned;

    if(autoreward) {
      _reward(account);
    }
    if(burned > 0){
      tokenInterface.burn(burned);
    }
    
    tokenInterface.transfer(account, amount);

    emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
    emit UpdateData(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
    emit Withdraw(account, amount, burned);
    return amount;
  }

  // Claims rewards
  function claim() public update {
    address account = msg.sender;
    Data storage user = data[account];

    _updateRewards(account);

    require(user.notClaimed > 0, "TutellusLaunchpadStaking: nothing to claim");

    _reward(account);

    emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
    emit UpdateData(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
    emit Claim(account);
  }

  // Toggles autoreward
  function toggleAutoreward() public onlyFaction {
    autoreward = !autoreward;
    emit ToggleAutoreward(autoreward);
  }

  function _reward(address account) internal {
    ITutellusRewardsVaultV2 rewardsInterface = ITutellusRewardsVaultV2(ITutellusManager(config).get(keccak256("LAUNCHPAD_VAULT")));
    uint256 amount = data[account].notClaimed;
    if(amount > 0) {
      data[account].notClaimed = 0;
      rewardsInterface.distribute(account, amount);
      emit Rewards(account, amount);
    }
  }

  // Gets current fee for a user
  function getFee(address account) public view returns(uint256) {
    Data memory user = data[account];
    uint256 fee = block.number < user.endInterval ? user.feeInterval > 0 ? user.maxFee * (user.endInterval - block.number) / user.feeInterval : user.minFee : user.minFee;
    return fee > user.minFee ? fee : user.minFee;
  }

  // Gets blocks until endInverval
  function getBlocksLeft(address account) public view returns (uint) {
    if(block.number > data[account].endInterval) {
      return 0;
    } else {
      return data[account].endInterval - block.number;
    }
  }

  // Gets user pending rewards
  function pendingRewards(address account) public view returns(uint256) {
      Data memory user = data[account];
      uint256 rewards = user.notClaimed;
      if(balance > 0){
        ITutellusRewardsVaultV2 rewardsInterface = ITutellusRewardsVaultV2(ITutellusManager(config).get(keccak256("REWARDS")));
        uint256 released = rewardsInterface.released(address(this)) - _released;
        uint256 total = (released * 1e18 / balance);
        rewards += (accRewardsPerShare - user.rewardDebt + total) * user.amount / 1e18;
      }
      return rewards;
  }

  // Gets user staking balance
  function getUserBalance(address account) public view returns(uint256) {
    Data memory user = data[account];
    return user.amount;
  }
}
