// Inspired by ERC20SnapshotUpgradeable from OpenZeppelin
// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "./ERC20VariableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ArraysUpgradeable.sol";

abstract contract ERC20SnapshotVariableAndStatic is ERC20VariableUpgradeable {
    
    using ArraysUpgradeable for uint256[];
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct Snapshots {
        uint256[] ids;
        uint256[] values;
    }

    /** ERC20 storage */
    mapping(address=>uint256) public staticBalanceOf;
    uint256 public staticTotalSupply;

    /** Snapshot storage */
    mapping(uint256 => uint256) private _snapshotNormalization;
    mapping(address => Snapshots) private _accountBalanceSnapshots;
    Snapshots private _totalSupplySnapshots;
    CountersUpgradeable.Counter private _currentSnapshotId;

    /** Events */

    event Snapshot(uint256 id, uint256 normalization, uint256 totalSupply);
    event MintStatic(address sender, address account, uint256 amount);
    event BurnStatic(address sender, address account, uint256 amount);

    /** Snapshot methods */

    function _snapshot() internal virtual returns (uint256) {
        _currentSnapshotId.increment();
        uint256 currentId = _getCurrentSnapshotId();
        uint256 currentNormalization = _getNormalization();
        uint256 tSupply = totalSupply();

        _snapshotNormalization[currentId] = currentNormalization;

        _updateSnapshot(_totalSupplySnapshots, tSupply);

        emit Snapshot(currentId, currentNormalization, tSupply);
        return currentId;
    }

    function _getCurrentSnapshotId() internal view virtual returns (uint256) {
        return _currentSnapshotId.current();
    }

    function balanceOfAt(address account, uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _accountBalanceSnapshots[account]);

        return snapshotted ? value : balanceOf(account);
    }

    function totalSupplyAt(uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _totalSupplySnapshots);

        return snapshotted ? value : totalSupply();
    }

    function _valueAt(uint256 snapshotId, Snapshots storage snapshots) internal view returns (bool, uint256) {
        require(snapshotId > 0, "ERC20Snapshot: id is 0");
        require(snapshotId <= _getCurrentSnapshotId(), "ERC20Snapshot: nonexistent id");

        // When a valid snapshot is queried, there are three possibilities:
        //  a) The queried value was not modified after the snapshot was taken. Therefore, a snapshot entry was never
        //  created for this id, and all stored snapshot ids are smaller than the requested one. The value that corresponds
        //  to this id is the current one.
        //  b) The queried value was modified after the snapshot was taken. Therefore, there will be an entry with the
        //  requested id, and its value is the one to return.
        //  c) More snapshots were created after the requested one, and the queried value was later modified. There will be
        //  no entry for the requested id: the value that corresponds to it is that of the smallest snapshot id that is
        //  larger than the requested one.
        //
        // In summary, we need to find an element in an array, returning the index of the smallest value that is larger if
        // it is not found, unless said value doesn't exist (e.g. when all values are smaller). Arrays.findUpperBound does
        // exactly this.

        uint256 index = snapshots.ids.findUpperBound(snapshotId);

        if (index == snapshots.ids.length) {
            return (false, 0);
        } else {
            return (true, snapshots.values[index]);
        }
    }

    function _updateAccountSnapshot(address account) private {
        uint256 sBalance = scaledBalanceOf(account);
        uint256 lastId = _getCurrentSnapshotId();
        uint256 lastNormalization = _snapshotNormalization[lastId];

        uint256 totalBalance = _unscaleTo(sBalance, lastNormalization) + staticBalanceOf[account];
        _updateSnapshot(_accountBalanceSnapshots[account], totalBalance);
    }

    function _updateSnapshot(Snapshots storage snapshots, uint256 currentValue) internal {
        uint256 currentId = _getCurrentSnapshotId();
        if (_lastSnapshotId(snapshots.ids) < currentId) {
            snapshots.ids.push(currentId);
            snapshots.values.push(currentValue);
        }
    }

    function _lastSnapshotId(uint256[] storage ids) private view returns (uint256) {
        if (ids.length == 0) {
            return 0;
        } else {
            return ids[ids.length - 1];
        }
    }

    /** ERC20 methods */

    function _mintStatic (
      address account,
      uint256 amount
    ) internal {
      require(account != address(0), "ERC20SnapshotVariableAndStatic: mint to the zero address");
      _beforeTokenTransfer(address(0), account, amount);

      require(amount > 0, "ERC20SnapshotVariableAndStatic: cant mint 0 tokens");

      staticTotalSupply += amount;
      staticBalanceOf[account] += amount;
      emit Transfer(address(0), account, amount);
      // emit Mint(msg.sender, account, amount);
      emit MintStatic(msg.sender, account, amount);

      _afterTokenTransfer(address(0), account, amount);
    }

    function _burnStatic (
      address account,
      uint256 amount
    ) internal {
      require(account != address(0), "ERC20SnapshotVariableAndStatic: burn from the zero address");

      _beforeTokenTransfer(account, address(0), amount);

      uint256 accountBalance = staticBalanceOf[account];
      require(accountBalance >= amount, "ERC20SnapshotVariableAndStatic: burn amount exceeds balance");
      require(amount > 0, "ERC20SnapshotVariableAndStatic: cant burn 0 tokens");
      unchecked {
          staticBalanceOf[account] = accountBalance - amount;
      }
      staticTotalSupply -= amount;

      emit Transfer(account, address(0), amount);
      // emit Burn(msg.sender, account, amount);
      emit BurnStatic(msg.sender, account, amount);

      _afterTokenTransfer(account, address(0), amount);
    }

    function balanceOf (
      address account
    ) public view override returns (uint256) {
      return super.balanceOf(account) + staticBalanceOf[account];
    }

    function totalSupply () public view override returns (uint256) {
      return super.totalSupply() + staticTotalSupply;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0)) {
            // mint
            _updateAccountSnapshot(to);
        } else if (to == address(0)) {
            // burn
            _updateAccountSnapshot(from);
        } else {
            // transfer
            _updateAccountSnapshot(from);
            _updateAccountSnapshot(to);
        }
    }

    /** Setup */

    function __ERC20SnapshotVariableAndStatic_init(string memory name_, string memory symbol_, uint256 rate_) internal onlyInitializing {
        __ERC20Variable_init_unchained(name_, symbol_, rate_);
        __ERC20SnapshotVariableAndStatic_init_unchained();
    }

    function __ERC20SnapshotVariableAndStatic_init_unchained() internal onlyInitializing {
    }
}