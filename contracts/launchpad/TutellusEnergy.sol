// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '../utils/UUPSUpgradeableByRole.sol';
import '../utils/ERC20VariableSnapshotUpgradeable.sol';

/**
 * @title TutellusEnergy
 * @notice Implements a variable energy token
 * @author Tutellus 
 **/

contract TutellusEnergy is ERC20VariableSnapshotUpgradeable, UUPSUpgradeableByRole {

    bytes32 public constant ENERGY_MANAGER_ROLE = keccak256('ENERGY_MANAGER_ROLE');
    bytes32 public constant ENERGY_MINTER_ROLE = keccak256('ENERGY_MINTER_ROLE');

    mapping(address=>uint256) public staticBalanceOf;
    uint256 public staticTotalSupply;

    mapping(bytes32=>mapping(address=>uint256)) private _eventBalanceOf;
    mapping(bytes32=>uint256) private _eventTotalSupply;

    mapping(bytes32=>Snapshots) private _eventTotalSupplySnapshots;
    mapping(bytes32=>mapping(address=>Snapshots)) private _eventBalanceOfSnapshots;

    function initialize (
    ) public initializer {
      __ERC20VariableSnapshot_init('Tutellus Energy', 'eTUT',  1e25); // 0.01 RAY = 1% yearly default
      __AccessControlProxyPausable_init(msg.sender);
    }

    function snapshot () public onlyRole(ENERGY_MANAGER_ROLE) returns (uint256) {
      return _snapshot();
    }

    function getCurrentSnapshotId () public view returns (uint256) {
      return _getCurrentSnapshotId();
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
      require(amount <= balanceOf(account), 'TutellusEnergy: amount exceeds balance');
      uint256 variableBalance = super.balanceOf(account); 
      if (amount > variableBalance) {
        uint256 remainder = amount - variableBalance;
        burnStatic(account, remainder);
        if (variableBalance > 0) {
          burnVariable(account, variableBalance);
        }
      } else {
        burnVariable(account, amount);
      }
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
      _beforeEventTokenTransfer(eventId, address(0), account, amount);

      require(amount != 0, 'Cant mint 0 tokens');

      _eventBalanceOf[eventId][account] += amount;
      _eventTotalSupply[eventId] += amount;

      // emit Transfer(address(0), account, amount);
      // emit Mint(msg.sender, account, amount);

      // _afterTokenTransfer(address(0), account, amount);
    }

    function burnEvent (
      bytes32 eventId,
      address account,
      uint256 amount
    ) public {
      require(account != address(0), "TutellusEnergy: burn from the zero address");

      _beforeEventTokenTransfer(eventId, account, address(0), amount);

      require(amount != 0, 'Cant burn 0 tokens');

      uint256 accountBalance = _eventBalanceOf[eventId][account];
      require(accountBalance >= amount, "TutellusEnergy: burn amount exceeds balance");
      unchecked {
          _eventBalanceOf[eventId][account] = accountBalance - amount;
      }
      _eventTotalSupply[eventId] -= amount;

      // emit Transfer(account, address(0), amount);
      // emit Burn(msg.sender, account, amount);

      // _afterTokenTransfer(account, address(0), amount);
    }

    function _beforeTokenTransfer (
      address from,
      address to,
      uint256 amount
    ) internal
      whenNotPaused onlyRole(ENERGY_MINTER_ROLE)
      override
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _beforeEventTokenTransfer (
      bytes32 eventId,
      address from,
      address to,
      uint256 amount
    ) internal whenNotPaused onlyRole(ENERGY_MINTER_ROLE)
    {
      if (from == address(0)) {
        _updateSnapshot(_eventBalanceOfSnapshots[eventId][to], eventBalanceOf(eventId, to));
        _updateSnapshot(_eventTotalSupplySnapshots[eventId], eventTotalSupply(eventId));
      }
      if (to == address(0)) {
        _updateSnapshot(_eventBalanceOfSnapshots[eventId][from], eventBalanceOf(eventId, from));
        _updateSnapshot(_eventTotalSupplySnapshots[eventId], eventTotalSupply(eventId));
      }
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

    function eventBalanceOf (
      bytes32 eventId,
      address account
    ) public view returns (uint256) {
      return balanceOf(account) + _eventBalanceOf[eventId][account];
    }

    function eventBalanceOfAt(bytes32 eventId, address account, uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _eventBalanceOfSnapshots[eventId][account]);

        return snapshotted ? value : eventBalanceOf(eventId, account);
    }

    function totalSupply () public view override returns (uint256) {
      return super.totalSupply() + staticTotalSupply;
    }

    function eventTotalSupply (
      bytes32 eventId
    ) public view returns (uint256) {
      return totalSupply() + _eventTotalSupply[eventId];
    }

    function eventTotalSupplyAt(bytes32 eventId, uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _eventTotalSupplySnapshots[eventId]);

        return snapshotted ? value : eventTotalSupply(eventId);
    }

    /**
     * This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    // uint256[45] private __gap;
  }
