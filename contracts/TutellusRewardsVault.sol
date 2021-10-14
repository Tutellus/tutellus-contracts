// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlProxyPausable.sol";
import "./interfaces/ITutellusERC20.sol";

contract TutellusRewardsVault is AccessControlProxyPausable {

    struct Info {
      uint256 allocation;
      uint256 released;
      uint256 distributed;
    }

    mapping(address=>Info) public info;
    mapping(uint256=>address) private id;
    
    uint private _lastUpdate;
    uint private _startBlock;
    uint private _endBlock;
    uint256 private _increment;
    uint256 private _total;

    address public token;

    event Init(uint startBlock, uint endBlock, uint256 increment);
    event Add(address account);
    event UpdateAllocation(uint256[] allocation);
    event DistributeTokens(address sender, address account, uint256 amount);

    constructor (
      address rolemanager,
      address token_, 
      uint256 amount, 
      uint startBlock_,
      uint endBlock_
    )  
    {
      __TutellusRewardsVault_init(
        rolemanager,
        token_, 
        amount, 
        startBlock_,
        endBlock_
      );
    }

    function startBlock() public view returns (uint) {
      return _startBlock;
    } 

    function endBlock() public view returns (uint) {
      return _endBlock;
    }

    function add(address account, uint256[] memory allocation) public onlyRole(DEFAULT_ADMIN_ROLE) {
      id[_total] = account;
      info[account] = Info(0,0,0);
      _total+=1;
      updateAllocation(allocation);
      emit Add(account);
    }

    function updateAllocation(uint256[] memory allocation) public onlyRole(DEFAULT_ADMIN_ROLE) {
      uint256 sum = 0;
      uint256 length = allocation.length;
      require(length == _total, "TutellusRewardsVault: allocation array must have same length as number of accounts");
      for(uint256 i=0; i<length; i++) {
        info[id[i]].released = releasedId(id[i]);
        info[id[i]].allocation = allocation[i];
        sum+=allocation[i];
      }
      _lastUpdate = block.number;
      require(sum==1e20, "TutellusRewardsVault: total allocation must be 1e20");
      emit UpdateAllocation(allocation);
    }

    function released() public view returns (uint256) {
      return releasedRange(_startBlock, block.number);
    }

    function availableId(address account) public view returns (uint256) {
      return releasedId(account) - info[account].distributed;
    }

    function releasedRange(uint from, uint to) public view returns (uint256) {
      require(from <= to, "TutellusRewardsVault: {from} is after {to}");
      if (to > _endBlock) {
        to = _endBlock;
      }
      if (from < _startBlock) {
        from = _startBlock;
      }
      uint256 comp0 = (_increment * ((to - _startBlock) ** 2)) / 2;
      uint256 comp1 = (_increment * ((from - _startBlock) ** 2)) / 2;
      return comp0 - comp1;
    }

    function releasedId(address account) public view returns (uint256) {
      return info[account].released + ((releasedRange(_lastUpdate, block.number) * info[account].allocation) / 1e20);
    }

    function distributeTokens(address account, uint256 amount) public {
      require(amount <= availableId(msg.sender), "TutellusRewardsVault: amount exceeds available");
      info[msg.sender].distributed += amount;
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      tokenInterface.transfer(account, amount);
      emit DistributeTokens(msg.sender, account, amount);
    }

    function __TutellusRewardsVault_init(
      address rolemanager,
      address token_, 
      uint256 amount, 
      uint startBlock_,
      uint endBlock_
    ) 
      internal 
      initializer 
    {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusRewardsVault_init_unchained(
        token_,
        amount, 
        startBlock_,
        endBlock_
      );
    }

    function __TutellusRewardsVault_init_unchained(
      address token_, 
      uint256 amount, 
      uint startBlock_,
      uint endBlock_
    ) 
      internal 
      initializer 
    {   
        require(endBlock_ > startBlock_, "TutellusRewardsVault: start block exceeds end block");
        token = token_;
        _startBlock = startBlock_;
        _endBlock = endBlock_;
        uint blocks = endBlock_ - startBlock_;
        _increment = (2 * amount) / (blocks ** 2);
        _lastUpdate = block.number;
        emit Init(_startBlock, _endBlock, _increment);
    }
}
