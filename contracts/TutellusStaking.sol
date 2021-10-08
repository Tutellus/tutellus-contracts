// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlProxyPausable.sol";
import "./interfaces/ITutellusERC20.sol";
import "./interfaces/ITutellusYieldRewardsVault.sol";

contract TutellusStaking is AccessControlProxyPausable {

    address public token;
    address public vault;

    bool public autoreward;

    uint256 public balance;
    uint256 public minFee;
    uint256 public maxFee;
    uint256 public accRewardsPerShare;
    uint256 private _released;

    uint public lastUpdate;
    uint public feeInterval;
    uint public endBlock;
    uint public stakers;

    struct UserInfo {
      uint256 amount;
      uint256 rewardDebt;
      uint256 notClaimed;
      uint endInterval;
      uint256 minFee;
      uint256 maxFee;
      uint256 feeInterval;
    }

    mapping(address=>UserInfo) private _userInfo;

    event Claim(address account);
    event Deposit(address account, uint256 amount);
    event Withdraw(address account, uint256 amount, uint256 burned);
    event Rewards(address account, uint256 amount);

    event SyncBalance(address account, uint256 gap);
    event ToggleAutoreward(bool autoreward);
    event Update(uint256 balance, uint256 accRewardsPerShare, uint lastUpdate, uint stakers);
    event UpdateUserInfo(address account, uint256 amount, uint256 rewardDebt, uint256 notClaimed, uint endInterval);
    event UpdateFees(uint256 minFee, uint256 maxFee, uint feeInterval);
    event updatevault(address vault);
    event UpdateEndBlock(uint endBlock);

    // Updates a level
    function _update() internal {
      if (block.number <= lastUpdate) {
        return;
      }
      if(balance > 0) {
        ITutellusYieldRewardsVault rewardsInterface = ITutellusYieldRewardsVault(vault);
        uint256 released = rewardsInterface.releasedId(address(this)) - _released;
        _released += released;
        accRewardsPerShare += (released * 1e18 / balance);
      }
      lastUpdate = block.number;
    }

    // Sets maximum and minimum fees
    function setFees(uint256 minFee_, uint256 maxFee_) public onlyRole(DEFAULT_ADMIN_ROLE) {
      require(minFee_ < maxFee_, "TutellusStaking: mininum fee must be greater than maximum fee");
      require(minFee_ <= 1e20 && maxFee_ <= 1e20, "TutellusStaking: fees must be less than 100e18");
      minFee = minFee_;
      maxFee = maxFee_;
      emit UpdateFees(minFee, maxFee, feeInterval);
    }

    // Sets fee interval (blocks) for staking
    function setFeeInterval(uint feeInterval_) public onlyRole(DEFAULT_ADMIN_ROLE) {
      feeInterval = feeInterval_;
      emit UpdateFees(minFee, maxFee, feeInterval);
    }

    // Updates rewards for an account
    function _updateRewards(address account) internal {
      UserInfo storage user = _userInfo[account];
      uint256 diff = accRewardsPerShare - user.rewardDebt;
      user.notClaimed = diff * user.amount / 1e18;
      user.rewardDebt = accRewardsPerShare;
    }

    // Deposits tokens for staking
    function depositFrom(address account, uint256 amount) public whenNotPaused {
      require(block.number < endBlock, "TutellusStaking: staking contract has finished");
      require(amount > 0, "TutellusStaking: amount must be over zero");

      UserInfo storage user = _userInfo[account];

      _update();
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

      ITutellusERC20 tokenInterface = ITutellusERC20(token);

      require(tokenInterface.balanceOf(account) >= amount, "TutellusStaking: user has not enough balance");
      require(tokenInterface.allowance(account, address(this)) >= amount, "TutellusStaking: amount exceeds allowance");

      if(autoreward) {
        _reward(account);
      }

      require(tokenInterface.transferFrom(account, address(this), amount), "TutellusStaking: deposit transfer failed");

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Deposit(account, amount);
    }

    // Withdraws tokens from staking
    function withdraw(uint256 amount) public whenNotPaused {
      require(amount > 0, "TutellusStaking: amount must be over zero");

      address account = msg.sender;
      UserInfo storage user = _userInfo[account];

      require(amount <= user.amount, "TutellusStaking: user has not enough staking balance");

      _update();
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
      require(tokenInterface.transfer(account, amount), "TutellusStaking: withdraw transfer failed");

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Withdraw(account, amount, burned);
    }

    // Claims rewards
    function claim() public whenNotPaused {
      address account = msg.sender;
      UserInfo storage user = _userInfo[account];

      _update();
      _updateRewards(account);

      require(user.notClaimed > 0, "TutellusStaking: nothing to claim");

      _reward(account);

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Claim(account);
    }

    // Toggles autoreward
    function toggleAutoreward() public onlyRole(DEFAULT_ADMIN_ROLE) {
      autoreward = !autoreward;
      emit ToggleAutoreward(autoreward);
    }

    function _reward(address account) internal {
      ITutellusYieldRewardsVault rewardsInterface = ITutellusYieldRewardsVault(vault);
      uint256 amount = _userInfo[account].notClaimed;
      if(amount > 0) {
        _userInfo[account].notClaimed = 0;
        rewardsInterface.distributeTokens(account, amount);
        emit Rewards(account, amount);
      }
    }

    // Gets current fee for a user
    function getFee(address account) public view returns(uint256) {
      UserInfo memory user = _userInfo[account];
      uint256 fee = block.number < user.endInterval ? user.feeInterval > 0 ? user.maxFee * (user.endInterval - block.number) / user.feeInterval : user.minFee : user.minFee;
      return fee > user.minFee ? fee : user.minFee;
    }

    // Gets blocks until endInverval
    function getBlocksLeft(address account) public view returns (uint) {
      if(block.number > _userInfo[account].endInterval) {
        return 0;
      } else {
        return _userInfo[account].endInterval - block.number;
      }
    }

    // Gets user pending rewards
    function pendingRewards(address user_) public view returns(uint256) {
        UserInfo memory user = _userInfo[user_];
        uint256 rewards = user.notClaimed;
        if(balance > 0){
          ITutellusYieldRewardsVault rewardsInterface = ITutellusYieldRewardsVault(vault);
          uint256 released = rewardsInterface.releasedId(address(this)) - _released;
          uint256 total = (released * 1e18 / balance);
          rewards += (accRewardsPerShare - user.rewardDebt + total) * user.amount / 1e18;
        }
        return rewards;
    }

    constructor (address token_, address rolemanager, address vault_, uint256 minFee_, uint256 maxFee_, uint feeInterval_) {
      __TutellusStaking_init(token_, rolemanager, vault_, minFee_, maxFee_, feeInterval_);
    }

    function __TutellusStaking_init(address token_, address rolemanager, address vault_, uint256 minFee_, uint256 maxFee_, uint feeInterval_) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusStaking_init_unchained(token_, vault_, minFee_, maxFee_, feeInterval_);
    }

    function __TutellusStaking_init_unchained(address token_, address vault_, uint256 minFee_, uint256 maxFee_, uint feeInterval_) internal initializer {
      token = token_;
      vault = vault_;
      setFees(minFee_, maxFee_);
      setFeeInterval(feeInterval_);
      autoreward = true;
      lastUpdate = block.number;
    }

        // Gets token gap
    function getTokenGap() public view returns (uint256) {
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      uint256 tokenBalance = tokenInterface.balanceOf(address(this));
      return tokenBalance - balance;
    }

        // Synchronizes balance, transfering the gap to an external account
    function syncBalance(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      uint256 gap = getTokenGap();
      require(gap > 0, "TutellusStaking: there is no gap");
      tokenInterface.transfer(account, gap);
      emit SyncBalance(account, gap);
    }

        // Gets user staking balance
    function getUserBalance(address user_) public view returns(uint256){
      UserInfo memory user = _userInfo[user_];
      return user.amount;
    }

    function migrate(address to, bytes memory data) public returns (bytes memory){
      address account = msg.sender;
      uint256 amount = _userInfo[account].amount;
      withdraw(amount);
      (bool success, bytes memory response) = to.call(
            abi.encodeWithSignature("depositFrom(address,uint256,bytes memory)", account, amount, data)
        );
      require(success, "TutellusStaking: migration has failed");
      return response;
    }
}
