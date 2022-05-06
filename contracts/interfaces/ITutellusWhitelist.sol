// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title The interface of TutellusWhitelist
/// @notice Manages the whitelist for some parts of the Tutellus protocol
interface ITutellusWhitelist {

    /** EVENTS */

    /// @notice Emitted when the whitelist is enabled or disabled
    /// @param active Whether the whitelist is active or not
    event Active(bool indexed active);

    /// @notice Emitted when an address is added to the whitelist
    /// @param account Address added
    event Add(address indexed account);

    /// @notice Emitted when an address is removed from the whitelist
    /// @param account Address removed
    event Remove(address indexed account);

    /// @notice Emitted when merkleRoot and uri are updated
    /// @param merkleRoot Root of the merkle tree generated from a json of address => amount
    /// @param uri Uri, usually ipfs, where the json is located
    event UpdateMerkleRoot(bytes32 indexed merkleRoot, string indexed uri);

    /** METHODS */

    /// @notice Returns whether the whitelist is active or not
    /// @return isActive Whether whitelist is active or not
    function active() external returns ( bool isActive );

    /// @notice Adds a new address to the whitelist
    /// @param index Position of the account in the whitelist json
    /// @param account Address to add
    /// @param merkleProof Array of hashes as proof of verification
    function add(
        uint256 index,
        address account,
        bytes32[] calldata merkleProof
    ) external;

    /// @notice Initializes the whitelist contract
    function initialize() external;

    /// @notice Returns the merkle root, which serves to verify claims
    /// @return merkleRoot Root of the merkle tree from the claims json
    function merkleRoot() external returns ( bytes32 merkleRoot );

    /// @notice Removes an address to the whitelist
    /// @param account Address to remove
    function remove(
        address account
    ) external;

    /// @notice Enables or disables the whitelist
    function toggleActive() external;

    /// @notice Updates the merkleRoot and uri
    /// @param merkleRoot_ Root of the merkle tree of the json
    /// @param uri_ Uri where whitelist json is located
    function updateMerkleRoot(
        bytes32 merkleRoot_,
        string memory uri_
    ) external;

    /// @notice Returns the uri where claims json is located
    /// @return uri Uri, usually ipfs
    function uri() external returns ( string memory uri );

    /// @notice Returns whether an address is whitelisted or not
    /// @param account Address to query
    /// @return isWhitelisted Whether account is whitelisted or not
    function whitelisted(
        address account
    ) external view returns ( bool isWhitelisted );
}
