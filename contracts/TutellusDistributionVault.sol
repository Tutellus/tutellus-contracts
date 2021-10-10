// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/ITutellusERC20.sol";
import "./utils/AccessControlProxyPausable.sol";

contract TutellusDistributionVault is AccessControlProxyPausable {

    address public token;
    uint256 private _limit;
    uint256 private _minted;

    struct Holder{
        uint256 distributed;
        uint256 releasePerBlock;
        uint startBlock;
        uint endBlock;
    }

    event Update(address account);
    event Distribute(address sender, address account, uint256 amount);
    event AddHolder(address holder, uint256 allocated, uint startBlock, uint endBlock);

    mapping (address=>Holder) public holders;

    constructor(address rolemanager, address token_, uint256 limit) {
      __TutellusDistributionVault_init(rolemanager, token_, limit);
    }

    function __TutellusDistributionVault_init(address rolemanager, address token_, uint256 limit) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusDistributionVault_init_unchained(token_, limit);
    }

    function __TutellusDistributionVault_init_unchained(address token_, uint256 limit) internal initializer {
      token = token_;
      _limit = limit;
    }

    function allocated(address account) public view returns(uint256){
      if(releasePerBlock(account) > 0) {
        return (endBlock(account) - startBlock(account)) * releasePerBlock(account);
      } else {
        return 0;
      }
    }

    function released(address account) public view returns(uint256){
      if (allocated(account) > 0) {
        if (block.number > endBlock(account)) {
          return allocated(account);
        } else {
          if (block.number > startBlock(account)) {
            return (block.number - startBlock(account)) * releasePerBlock(account);
          } else {
            return 0;
          }
        }
      } else {
        return 0;
      }
    }

    function distributed(address account) public view returns(uint256){
      return holders[account].distributed;
    }

    function releasePerBlock(address account) public view returns(uint256){
      return holders[account].releasePerBlock;
    }

    function endBlock(address account) public view returns(uint256){
      return holders[account].endBlock;
    }

    function startBlock(address account) public view returns(uint256){
      return holders[account].startBlock;
    }

    function available(address account) public view returns(uint256){
      return released(account) - distributed(account);
    }

    function distribute(address account) public whenNotPaused {
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      uint256 amount = available(account);
      require(amount > 0, "TutellusDistributionVault: no available tokens");
      holders[account].distributed += amount;
      tokenInterface.transfer(account, amount);
      emit Distribute(msg.sender, account, amount);
    }

    function claim() public {
        address account = msg.sender;
        distribute(account);
    }

    function addHolderBatch(address[] memory account, uint256[] memory allocated_, uint[] memory startBlocks, uint[] memory endBlocks) public {
      for(uint256 i=0; i< account.length; i++) {
        addHolder(account[i], allocated_[i], startBlocks[i], endBlocks[i]);
      }
    }

    function addHolder(address account, uint256 allocated_, uint startBlocks, uint endBlocks) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(endBlocks > startBlocks, "TutellusDistributionVault: start block exceeds end block");
        _minted += allocated_;
        require(_minted <= _limit, "TutellusDistributionVault: minted exceeds limit");
        holders[account].distributed = 0;
        holders[account].releasePerBlock = allocated_ / (endBlocks - startBlocks);
        holders[account].startBlock = block.number + startBlocks;
        holders[account].endBlock = block.number + endBlocks;
        ITutellusERC20 tokenInterface = ITutellusERC20(token);
        tokenInterface.mint(address(this), allocated_);
        emit AddHolder(account, allocated_, holders[account].startBlock, holders[account].endBlock);
    }
}