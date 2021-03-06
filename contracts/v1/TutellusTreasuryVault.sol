// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/AccessControlProxyPausable.sol";
import "contracts/interfaces/ITutellusERC20.sol";

contract TutellusTreasuryVault is AccessControlProxyPausable {

    address public token;
    address public treasury;

    uint256 private _distributed;
    uint private _startBlock;
    uint private _endBlock;
    uint private _increment;

    event Claim(address sender, address treasury, uint256 amount);
    event Init(uint startBlock, uint endBlock, uint256 increment);
    event UpdateTreasury(address previous, address next);

    constructor (address rolemanager,
      address treasury_,
      address token_,
      uint256 amount, 
      uint startBlock_,
      uint endBlock_
    )
    {
      __TutellusTreasuryVault_init(
        rolemanager,
        treasury_,
        token_,
        amount, 
        startBlock_,
        endBlock_
      );
    }

    function released() public view returns (uint256) {
      return releasedRange(_startBlock, block.number);
    }

    function releasedRange(uint from, uint to) public view returns (uint256) {
      require(from < to, "TutellusTreasuryVault: {from} is after {to}");
      if (to > _endBlock) to = _endBlock;
      if (from < _startBlock) from = _startBlock;
      uint256 comp0 = (_increment * ((to - _startBlock) ** 2)) / 2;
      uint256 comp1 = (_increment * ((from - _startBlock) ** 2)) / 2;
      return comp0 - comp1;
    }

    function updateTreasury(address treasury_) public onlyRole(DEFAULT_ADMIN_ROLE) {
      address previous = treasury;
      treasury = treasury_;
      address next = treasury;
      emit UpdateTreasury(previous, next);
    }

    function claim() public {
      uint256 amount = released() - _distributed;
      _distributed += amount;
      require(amount > 0, "TutellusTreasuryVault: nothing to claim");
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      tokenInterface.transfer(treasury, amount);
      emit Claim(msg.sender, treasury, amount);
    }

    function __TutellusTreasuryVault_init(
      address rolemanager,
      address treasury_,
      address token_,
      uint256 amount, 
      uint startBlock_,
      uint endBlock_
    ) 
      internal 
      initializer 
    {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusTreasuryVault_init_unchained(
        treasury_,
        token_,
        amount, 
        startBlock_,
        endBlock_
      );
    }

    function __TutellusTreasuryVault_init_unchained(
      address treasury_,
      address token_,
      uint256 amount,
      uint startBlock_,
      uint endBlock_
    ) 
      internal 
      initializer 
    {   
      require(endBlock_ > startBlock_, "TutellusTreasuryVault: start block exceeds end block");
      token = token_;
      treasury = treasury_;
      _startBlock = startBlock_;
      _endBlock = endBlock_;
      uint blocks = endBlock_ - startBlock_;
      _increment = (2 * amount) / (blocks ** 2);
      emit Init(_startBlock, _endBlock, _increment);
    }
}
