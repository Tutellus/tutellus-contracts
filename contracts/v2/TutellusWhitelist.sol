// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusWhitelist.sol";

/// @title The contract of TutellusWhitelist
/// @notice Manages the whitelist for some parts of the Tutellus protocol
contract TutellusWhitelist is ITutellusWhitelist, UUPSUpgradeableByRole {

    /** STORAGE */
    
    bytes32 private immutable WHITELIST_ADMIN_ROLE = keccak256("WHITELIST_ADMIN_ROLE");

    /// @inheritdoc ITutellusWhitelist
    bytes32 public merkleRoot;

    /// @inheritdoc ITutellusWhitelist
    string public uri;

    mapping(address => bool) private _whitelisted;

    bool public active;

    /** METHODS */

    /// @inheritdoc ITutellusWhitelist
    function add(
        uint256 index,
        address account,
        bytes32[] calldata merkleProof
    ) external whenNotPaused {
        require(!_whitelisted[account], "TutellusWhitelist: account already whitelisted");
        bytes32 node = keccak256(abi.encodePacked(index, account));
        require(MerkleProofUpgradeable.verify(merkleProof, merkleRoot, node), "TutellusWhitelist: invalid proof.");
        _whitelisted[account] = true;
        emit Add(account);
    }

    /// @inheritdoc ITutellusWhitelist
    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        active = true;
    }

    /// @inheritdoc ITutellusWhitelist
    function remove(
        address account
    ) public onlyRole(WHITELIST_ADMIN_ROLE) {
        _whitelisted[account] = false;
        emit Remove(account);
    }

    /// @inheritdoc ITutellusWhitelist
    function toggleActive() public onlyRole(WHITELIST_ADMIN_ROLE) {
        active = !active;
        emit Active(active);
    }

    /// @inheritdoc ITutellusWhitelist
    function updateMerkleRoot(
        bytes32 merkleRoot_,
        string memory uri_
    ) public onlyRole(WHITELIST_ADMIN_ROLE){
        merkleRoot = merkleRoot_;
        uri = uri_;
        emit UpdateMerkleRoot(merkleRoot, uri);
    }

    /// @inheritdoc ITutellusWhitelist
    function whitelisted(
        address account
    ) public view returns ( bool ) {
        return active ? _whitelisted[account] : true;
    }

}
