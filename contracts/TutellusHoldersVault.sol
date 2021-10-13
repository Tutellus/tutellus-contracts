// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/ITutellusERC20.sol";
import "./utils/AccessControlProxyPausable.sol";

contract TutellusHoldersVault is AccessControlProxyPausable {

    address public token;
    uint private _startBlock;
    uint private _endBlock;
    uint256 private _limit;
    uint256 private _minted;
    mapping(address=>uint256) public distributed;
    mapping(address=>uint256) public allocated;

    event Update(address account);
    event Distribute(address sender, address account, uint256 amount);
    event Add(address holder, uint256 allocated);
    event AddBatch(uint256 length);
    event Init(uint startBlock, uint endBlock, uint256 limit);

    constructor(address rolemanager, address token_, uint256 limit, uint256 startBlock_, uint endBlock_) {
        require(endBlock_ > startBlock_, "TutellusHoldersVault: start block exceeds end block");
      __TutellusHoldersVault_init(rolemanager, token_, limit, startBlock_, endBlock_);
    }

    function __TutellusHoldersVault_init(address rolemanager, address token_, uint256 limit, uint256 startBlock_, uint endBlock_) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusHoldersVault_init_unchained(token_, limit, startBlock_, endBlock_);
    }

    function __TutellusHoldersVault_init_unchained(address token_, uint256 limit, uint256 startBlock_, uint endBlock_) internal initializer {
      token = token_;
      _limit = limit;
      _startBlock = startBlock_;
      _endBlock = endBlock_;
      emit Init(_startBlock, _endBlock, limit);
    }

    function released(address account) public view returns(uint256) {
      uint current = block.number;
      if (current > _endBlock) {
        return allocated[account];
      } else if (current < _startBlock) {
        return 0;
      } else {
        uint blocks = current - _startBlock;
        return allocated[account] * blocks / (_endBlock - _startBlock);
      }
    }

    function available(address account) public view returns(uint256) {
      return released(account) - distributed[account];
    }

    function distribute(address account) public whenNotPaused {
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      uint256 amount = available(account);
      require(amount > 0, "TutellusHoldersVault: no available tokens");
      distributed[account] += amount;
      tokenInterface.transfer(account, amount);
      emit Distribute(msg.sender, account, amount);
    }

    function claim() public {
        address account = msg.sender;
        distribute(account);
    }

    function addBatch(address[] memory account, uint256[] memory allocated_) public {
      require(account.length == allocated_.length, 'TutellusHoldersVault: length must be the same');
      require(account.length != 0, 'TutellusHoldersVault: length cannot be null');
      uint256 length = account.length;
      for(uint256 i=0; i< account.length; i++) {
        add(account[i], allocated_[i]);
      }
      emit AddBatch(length);
    }

    function add(address account, uint256 allocated_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _minted += allocated_;
        require(_minted <= _limit, "TutellusHoldersVault: minted exceeds limit");
        distributed[account] = 0;
        allocated[account] = allocated_;
        ITutellusERC20 tokenInterface = ITutellusERC20(token);
        tokenInterface.mint(address(this), allocated_);
        emit Add(account, allocated_);
    }
}