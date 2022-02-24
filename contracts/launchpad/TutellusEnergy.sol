// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '../utils/UUPSUpgradeableByRole.sol';
import '../utils/ERC20VariableUpgradeable.sol';
import '../utils/ERC20VariableSnapshotUpgradeable.sol';

/**
 * @title TutellusEnergy
 * @notice Implements a variable energy token
 * @author Tutellus 
 **/

contract TutellusEnergy is ERC20VariableUpgradeable, ERC20VariableSnapshotUpgradeable, UUPSUpgradeableByRole {

    bytes32 public constant ENERGY_MANAGER_ROLE = keccak256('ENERGY_MANAGER_ROLE');
    bytes32 public constant ENERGY_MINTER_ROLE = keccak256('ENERGY_MINTER_ROLE');

    mapping(address=>uint256) public staticBalanceOf;
    uint256 public staticTotalSupply;

    mapping(bytes32=>mapping(address=>uint256)) public eventBalanceOf;
    mapping(bytes32=>uint256) public eventTotalSupply;

    function initialize (
    ) public initializer {
      __ERC20Variable_init('Energy Tutellus', 'eTUT', 1e27); // 1% yearly default
      __ERC20VariableSnapshot_init();
      __AccessControlProxyPausable_init(msg.sender);
    }

    function setRate (
      uint256 newRate
    ) public onlyRole(ENERGY_MANAGER_ROLE) {
      _setRate(newRate);
    }

    function mint (
      address account,
      uint256 amount
    ) public {
      mintVariable(account, amount);
    }

    function burn (
      address account,
      uint256 amount
    ) public {
      if (amount > super.balanceOf(account)) {
        uint256 remainder = amount - super.balanceOf(account);
        burnStatic(account, remainder);
      }
      burnVariable(account, amount);
    }

    function burnAll (
      address account
    ) public {
      burn(account, balanceOf(account));
    }

    function mintVariable (
      address account,
      uint256 amount
    ) public {
      _mint(account, amount);
    }

    function burnVariable (
      address account,
      uint256 amount
    ) public {
      _burn(account, amount);
    }

    function mintEvent (
      bytes32 eventId,
      address account,
      uint256 amount
    ) public {
      require(account != address(0), "TutellusEnergy: mint to the zero address");
      _beforeTokenTransfer(address(0), account, amount);

      require(amount != 0, 'Cant mint 0 tokens');

      eventBalanceOf[eventId][account] += amount;
      eventTotalSupply[eventId] += amount;

      emit Transfer(address(0), account, amount);
      emit Mint(msg.sender, account, amount);

      _afterTokenTransfer(address(0), account, amount);
    }

    function burnEvent (
      bytes32 eventId,
      address account,
      uint256 amount
    ) public {
      require(account != address(0), "TutellusEnergy: burn from the zero address");

      _beforeTokenTransfer(account, address(0), amount);

      require(amount != 0, 'Cant burn 0 tokens');

      uint256 accountBalance = eventBalanceOf[eventId][account];
      require(accountBalance >= amount, "TutellusEnergy: burn amount exceeds balance");
      unchecked {
          eventBalanceOf[eventId][account] = accountBalance - amount;
      }
      eventTotalSupply[eventId] -= amount;

      emit Transfer(account, address(0), amount);
      emit Burn(msg.sender, account, amount);

      _afterTokenTransfer(account, address(0), amount);
    }

    function _beforeTokenTransfer (
      address from,
      address to,
      uint256 amount
    ) internal
      whenNotPaused onlyRole(ENERGY_MINTER_ROLE)
      override(ERC20VariableUpgradeable, ERC20VariableSnapshotUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function mintStatic (
      address account,
      uint256 amount
    ) public {
      require(account != address(0), "TutellusEnergy: mint to the zero address");
      _beforeTokenTransfer(address(0), account, amount);

      require(amount != 0, 'Cant mint 0 tokens');

      staticTotalSupply += amount;
      staticBalanceOf[account] += amount;
      emit Transfer(address(0), account, amount);
      emit Mint(msg.sender, account, amount);

      _afterTokenTransfer(address(0), account, amount);
    }

    function burnStatic (
      address account,
      uint256 amount
    ) public {
      require(account != address(0), "TutellusEnergy: burn from the zero address");

      _beforeTokenTransfer(account, address(0), amount);

      uint256 accountBalance = staticBalanceOf[account];
      require(accountBalance >= amount, "TutellusEnergy: burn amount exceeds balance");
      unchecked {
          staticBalanceOf[account] = accountBalance - amount;
      }
      staticTotalSupply -= amount;

      emit Transfer(account, address(0), amount);
      emit Burn(msg.sender, account, amount);

      _afterTokenTransfer(account, address(0), amount);
    }

    function balanceOf (
      address account
    ) public view override returns (uint256) {
      return super.balanceOf(account) + staticBalanceOf[account];
    }

    function balanceOf (
      bytes32 eventId,
      address account
    ) public view returns (uint256) {
      return balanceOf(account) + eventBalanceOf[eventId][account];
    }

    function totalSupply (
    ) public view override returns (uint256) {
      return super.totalSupply() + staticTotalSupply;
    }

    function totalSupply (
      bytes32 eventId
    ) public view returns (uint256) {
      return totalSupply() + eventTotalSupply[eventId];
    }

    /**
     * This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
  }
