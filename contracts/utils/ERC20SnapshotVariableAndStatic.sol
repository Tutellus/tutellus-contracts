// Inspired by ERC20SnapshotUpgradeable from OpenZeppelin
// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "./ERC20VariableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ArraysUpgradeable.sol";

abstract contract ERC20SnapshotVariableAndStatic is ERC20VariableUpgradeable {
    function __ERC20SnapshotVariableAndStatic_init(string memory name_, string memory symbol_, uint256 rate_) internal onlyInitializing {
        __ERC20Variable_init_unchained(name_, symbol_, rate_);
        __ERC20SnapshotVariableAndStatic_init_unchained();
    }

    function __ERC20SnapshotVariableAndStatic_init_unchained() internal onlyInitializing {
    }

    mapping(address=>uint256) public staticBalanceOf;
    uint256 public staticTotalSupply;

    using ArraysUpgradeable for uint256[];
    using CountersUpgradeable for CountersUpgradeable.Counter;

    // Snapshotted values have arrays of ids and the value corresponding to that id. These could be an array of a
    // Snapshot struct, but that would impede usage of functions that work on an array.
    struct Snapshots {
        uint256[] ids;
        uint256[] values;
    }

    mapping(uint256 => uint256) private _snapshotNormalization;
    mapping(address => Snapshots) private _accountBalanceSnapshots;
    Snapshots private _totalSupplySnapshots;

    // Snapshot ids increase monotonically, with the first value being 1. An id of 0 is invalid.
    CountersUpgradeable.Counter private _currentSnapshotId;

    /**
     * @dev Emitted by {_snapshot} when a snapshot identified by `id` is created.
     */
    event Snapshot(uint256 id, uint256 normalization, uint256 totalSupply);

    /**
     * @dev Creates a new snapshot and returns its snapshot id.
     *
     * Emits a {Snapshot} event that contains the same id.
     *
     * {_snapshot} is `internal` and you have to decide how to expose it externally. Its usage may be restricted to a
     * set of accounts, for example using {AccessControl}, or it may be open to the public.
     *
     * [WARNING]
     * ====
     * While an open way of calling {_snapshot} is required for certain trust minimization mechanisms such as forking,
     * you must consider that it can potentially be used by attackers in two ways.
     *
     * First, it can be used to increase the cost of retrieval of values from snapshots, although it will grow
     * logarithmically thus rendering this attack ineffective in the long term. Second, it can be used to target
     * specific accounts and increase the cost of ERC20 transfers for them, in the ways specified in the Gas Costs
     * section above.
     *
     * We haven't measured the actual numbers; if this is something you're interested in please reach out to us.
     * ====
     */
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

    /**
     * @dev Get the current snapshotId
     */
    function _getCurrentSnapshotId() internal view virtual returns (uint256) {
        return _currentSnapshotId.current();
    }

    function balanceOf (
      address account
    ) public view override returns (uint256) {
      return super.balanceOf(account) + staticBalanceOf[account];
    }

    function totalSupply () public view override returns (uint256) {
      return super.totalSupply() + staticTotalSupply;
    }

    /**
     * @dev Retrieves the balance of `account` at the time `snapshotId` was created.
     */
    function balanceOfAt(address account, uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _accountBalanceSnapshots[account]);

        return snapshotted ? value : balanceOf(account);
    }

    /**
     * @dev Retrieves the total supply at the time `snapshotId` was created.
     */
    function totalSupplyAt(uint256 snapshotId) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(snapshotId, _totalSupplySnapshots);

        return snapshotted ? value : totalSupply();
    }

    // Update balance and/or total supply snapshots before the values are modified. This is implemented
    // in the _beforeTokenTransfer hook, which is executed for _mint, _burn, and _transfer operations.
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

    function _mintStatic (
      address account,
      uint256 amount
    ) internal {
      require(account != address(0), "TutellusEnergy: mint to the zero address");
      _beforeTokenTransfer(address(0), account, amount);

      require(amount != 0, 'Cant mint 0 tokens');

      staticTotalSupply += amount;
      staticBalanceOf[account] += amount;
      emit Transfer(address(0), account, amount);
      emit Mint(msg.sender, account, amount);

      _afterTokenTransfer(address(0), account, amount);
    }

    function _burnStatic (
      address account,
      uint256 amount
    ) internal {
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

    /**
     * This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;
}