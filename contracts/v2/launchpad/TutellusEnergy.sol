// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/utils/ERC20SnapshotVariableAndStatic.sol";
import "contracts/interfaces/ITutellusEnergy.sol";

/**
 * @title TutellusEnergy
 * @notice Implements a variable energy token
 * @author Tutellus
 **/

contract TutellusEnergy is
    ITutellusEnergy,
    ERC20SnapshotVariableAndStatic,
    UUPSUpgradeableByRole
{
    bytes32 private constant _ENERGY_MANAGER_ROLE =
        keccak256("ENERGY_MANAGER_ROLE");
    bytes32 private constant _ENERGY_MINTER_ROLE =
        keccak256("ENERGY_MINTER_ROLE");
    bytes32 private constant _SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    mapping(bytes32 => mapping(address => uint256)) private _eventBalanceOf;
    mapping(bytes32 => uint256) private _eventTotalSupply;

    mapping(bytes32 => Snapshots) private _eventTotalSupplySnapshots;
    mapping(bytes32 => mapping(address => Snapshots))
        private _eventBalanceOfSnapshots;

    /// @inheritdoc ITutellusEnergy
    function initialize() public initializer {
        __ERC20SnapshotVariableAndStatic_init("Tutellus Energy", "eTUT", 1e25); // 0.01 RAY = 1% yearly default
        __AccessControlProxyPausable_init(msg.sender);
    }

    /// @inheritdoc ITutellusEnergy
    function snapshot() public onlyRole(_SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    /// @inheritdoc ITutellusEnergy
    function getCurrentSnapshotId() public view returns (uint256) {
        return _getCurrentSnapshotId();
    }

    /// @inheritdoc ITutellusEnergy
    function setRate(uint256 newRate) public onlyRole(_ENERGY_MANAGER_ROLE) {
        _setRate(newRate);
    }

    /// @inheritdoc ITutellusEnergy
    function mint(address account, uint256 amount) public {
        mintStatic(account, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function burn(address account, uint256 amount) public {
        uint256 staticBalance = staticBalanceOf[account];
        if (amount > staticBalance) {
            uint256 remainder = amount - staticBalance;
            burnVariable(account, remainder);
            if (staticBalance > 0) {
                burnStatic(account, staticBalance);
            }
        } else {
            burnStatic(account, amount);
        }
    }

    /// @inheritdoc ITutellusEnergy
    function mintStatic(address account, uint256 amount) public {
        _mintStatic(account, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function burnStatic(address account, uint256 amount) public {
        _burnStatic(account, amount);
    }

    function burnAll(address account) public {
        burn(account, balanceOf(account));
    }

    function mintVariable(address account, uint256 amount) public {
        _mint(account, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function burnVariable(address account, uint256 amount) public {
        _burn(account, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function mintEvent(
        bytes32 eventId,
        address account,
        uint256 amount
    ) public {
        require(
            account != address(0),
            "TutellusEnergy: mint to the zero address"
        );

        _updateSnapshot(
            _eventBalanceOfSnapshots[eventId][account],
            _eventBalanceOf[eventId][account]
        );
        _updateSnapshot(
            _eventTotalSupplySnapshots[eventId],
            _eventTotalSupply[eventId]
        );

        require(amount != 0, "Cant mint 0 tokens");

        _eventBalanceOf[eventId][account] += amount;
        _eventTotalSupply[eventId] += amount;

        emit EventMint(eventId, account, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function burnEvent(
        bytes32 eventId,
        address account,
        uint256 amount
    ) public {
        require(
            account != address(0),
            "TutellusEnergy: burn from the zero address"
        );

        _updateSnapshot(
            _eventBalanceOfSnapshots[eventId][account],
            _eventBalanceOf[eventId][account]
        );
        _updateSnapshot(
            _eventTotalSupplySnapshots[eventId],
            _eventTotalSupply[eventId]
        );

        require(amount != 0, "Cant burn 0 tokens");

        uint256 accountBalance = _eventBalanceOf[eventId][account];
        require(
            accountBalance >= amount,
            "TutellusEnergy: burn amount exceeds balance"
        );
        unchecked {
            _eventBalanceOf[eventId][account] = accountBalance - amount;
        }
        _eventTotalSupply[eventId] -= amount;

        emit EventBurn(eventId, account, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused onlyRole(_ENERGY_MINTER_ROLE) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /// @inheritdoc ITutellusEnergy
    function eventBalanceOf(bytes32 eventId, address account)
        public
        view
        returns (uint256)
    {
        return balanceOf(account) + _eventBalanceOf[eventId][account];
    }

    function eventBalanceOfAt(
        bytes32 eventId,
        address account,
        uint256 snapshotId
    ) public view virtual returns (uint256) {
        (bool snapshotted, uint256 value) = _valueAt(
            snapshotId,
            _eventBalanceOfSnapshots[eventId][account]
        );

        return
            snapshotted
                ? value + balanceOfAt(account, snapshotId)
                : eventBalanceOf(eventId, account);
    }

    /// @inheritdoc ITutellusEnergy
    function eventTotalSupply(bytes32 eventId) public view returns (uint256) {
        return totalSupply() + _eventTotalSupply[eventId];
    }

    function eventTotalSupplyAt(bytes32 eventId, uint256 snapshotId)
        public
        view
        virtual
        returns (uint256)
    {
        (bool snapshotted, uint256 value) = _valueAt(
            snapshotId,
            _eventTotalSupplySnapshots[eventId]
        );

        return
            snapshotted
                ? value + totalSupplyAt(snapshotId)
                : eventTotalSupply(eventId);
    }

    // The following functions are overrides required by Solidity.

    /// @inheritdoc ITutellusEnergy
    function balanceOf(address account)
        public
        view
        override(ITutellusEnergy, ERC20SnapshotVariableAndStatic)
        returns (uint256)
    {
        return super.balanceOf(account);
    }

    /// @inheritdoc ITutellusEnergy
    function scale(uint256 amount)
        public
        view
        override(ITutellusEnergy, ERC20VariableUpgradeable)
        returns (uint256)
    {
        return super.scale(amount);
    }

    /// @inheritdoc ITutellusEnergy
    function unscale(uint256 amount)
        public
        view
        override(ITutellusEnergy, ERC20VariableUpgradeable)
        returns (uint256)
    {
        return super.unscale(amount);
    }
}
