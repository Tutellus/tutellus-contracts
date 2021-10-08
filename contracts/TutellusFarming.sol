// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlProxyPausable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ITutellusYieldRewardsVault.sol";

contract TutellusFarming is AccessControlProxyPausable {

    address public token;
    address public vault;

    bool public autoreward;

    uint256 public balance;
    uint256 public accRewardsPerShare;
    uint256 private _released;

    uint public lastUpdate;
    uint public stakers;

    struct UserInfo {
      uint256 amount;
      uint256 rewardDebt;
      uint256 notClaimed;
    }

    mapping(address=>UserInfo) private _userInfo;

    event Claim(address account);
    event Deposit(address account, uint256 amount);
    event Withdraw(address account, uint256 amount);
    event Rewards(address account, uint256 amount);
    event SyncBalance(address account, uint256 gap);
    event ToggleAutoreward(bool autoreward);
    event Update(uint256 balance, uint256 accRewardsPerShare, uint lastUpdate, uint stakers);
    event UpdateUserInfo(address account, uint256 amount, uint256 rewardDebt, uint256 notClaimed);

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

    // Updates rewards for an account
    function _updateRewards(address account) internal {
      UserInfo storage user = _userInfo[account];
      uint256 diff = accRewardsPerShare - user.rewardDebt;
      user.notClaimed = diff * user.amount / 1e18;
      user.rewardDebt = accRewardsPerShare;
    }

    // Deposits tokens for staking
    function depositFrom(address account, uint256 amount) public whenNotPaused {
      require(amount > 0, "TutellusFarming: amount must be over zero");

      UserInfo storage user = _userInfo[account];

      _update();
      _updateRewards(account);

      if(user.amount == 0) {
        stakers += 1;
      }

      user.amount += amount;
      balance += amount;

      IERC20 tokenInterface = IERC20(token);

      require(tokenInterface.balanceOf(account) >= amount, "TutellusFarming: user has not enough balance");
      require(tokenInterface.allowance(account, address(this)) >= amount, "TutellusFarming: amount exceeds allowance");

      if(autoreward) {
        _reward(account);
      }

      require(tokenInterface.transferFrom(account, address(this), amount), "TutellusFarming: deposit transfer failed");

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed);
      emit Deposit(account, amount);
    }

    // Withdraws tokens from staking
    function withdraw(uint256 amount) public whenNotPaused {
      require(amount > 0, "TutellusFarming: amount must be over zero");

      address account = msg.sender;
      UserInfo storage user = _userInfo[account];

      require(amount <= user.amount, "TutellusFarming: user has not enough staking balance");

      _update();
      _updateRewards(account);

      user.rewardDebt = accRewardsPerShare;
      user.amount -= amount;
      balance -= amount;

      if(user.amount == 0) {
        stakers -= 1;
      }

      IERC20 tokenInterface = IERC20(token);

      if(autoreward) {
        _reward(account);
      }

      require(tokenInterface.transfer(account, amount), "TutellusFarming: withdraw transfer failed");

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed);
      emit Withdraw(account, amount);
    }

    // Claims rewards
    function claim() public whenNotPaused {
      address account = msg.sender;
      UserInfo storage user = _userInfo[account];

      _update();
      _updateRewards(account);

      require(user.notClaimed > 0, "TutellusFarming: nothing to claim");

      _reward(account);

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed);
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

    constructor (address rolemanager, address token_, address vault_) {
      __TutellusFarming_init(rolemanager, token_, vault_);
    }

    function __TutellusFarming_init(address rolemanager, address token_, address vault_) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusFarming_init_unchained(token_, vault_);
    }

    function __TutellusFarming_init_unchained(address token_, address vault_) internal initializer {
      token = token_;
      vault = vault_;
      autoreward = true;
      lastUpdate = block.number;
    }

        // Gets token gap
    function getTokenGap() public view returns (uint256) {
      IERC20 tokenInterface = IERC20(token);
      uint256 tokenBalance = tokenInterface.balanceOf(address(this));
      if(tokenBalance > balance) {
        return tokenBalance - balance;
      } else {
        return 0;
      }
    }

        // Synchronizes balance, transfering the gap to an external account
    function syncBalance(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      IERC20 tokenInterface = IERC20(token);
      uint256 gap = getTokenGap();
      require(gap > 0, "TutellusFarming: there is no gap");
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
      require(success, "TutellusFarming: migration has failed");
      return response;
    }
}
