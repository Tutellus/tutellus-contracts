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

    function initialize() public initializer {
      __ERC20Variable_init('Energy Tutellus', 'eTUT', 1e27); // 1% yearly default
      __ERC20VariableSnapshot_init();
      __AccessControlProxyPausable_init(msg.sender);
    }

    function setRate(uint256 newRate) public onlyRole(ENERGY_MANAGER_ROLE) {
      _setRate(newRate);
    }

    function mint(address account, uint256 amount) external {
      _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
      _burn(account, amount);
    }

    function burnAll(address account) external {
      uint256 amount = balanceOf(account);
      _burn(account, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused onlyRole(ENERGY_MINTER_ROLE)
        override(ERC20VariableUpgradeable, ERC20VariableSnapshotUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
  }
