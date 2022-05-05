// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title The interface of TutellusClientsVaultV2
/// @dev Manages clients rewards with a efficient distribution using merkle trees verification
interface ITutellusClientsVaultV2 {

    /** EVENTS */

    /// @dev Emitted when a claim is executed
    /// @param index Position of the account in the original json 
    /// @param account Account who owns the reward
    /// @param amount Amount claimed
    event Claim(uint256 indexed index, address indexed account, uint256 indexed amount);

    /// @dev Emitted when merkleRoot and uri are updated
    /// @param merkleRoot Root of the merkle tree generated from a json of address => amount
    /// @param uri Uri, usually ipfs, where the json is located
    event UpdateMerkleRoot(bytes32 indexed merkleRoot, string indexed uri);

    /// @dev Returns the amount already claimed by an account
    /// @param account Address of the claimer
    /// @return amount Amount already claimed by the claimer
    function alreadyClaimed(address account) external returns ( uint256 amount );

    /// @dev Claims the claimable amount for an account
    /// @param index Position of the account in the original json
    /// @param account Address of the claimer
    /// @param amount Original amount from the json
    /// @param merkleProof Array of hashes, generated in the merkle tree genesis 
    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;

    /// @dev Initializes the vault
    function initialize() external;

    /// @dev Returns the claimable amount for an address
    /// @param index Position of the account in the original json
    /// @param account Address of the claimer
    /// @param amount Original amount from the json
    /// @param merkleProof Array of hashes, generated in the merkle tree genesis 
    /// @return claimable Claimable amount for the claimer address
    function leftToClaim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external view returns( uint256 claimable );

    /// @dev Returns the merkle root, which serves to verify claims
    /// @return merkleRoot Root of the merkle tree from the claims json
    function merkleRoot() external returns ( bytes32 merkleRoot );

    /// @dev Updates merkleRoot and uri
    /// @param merkleRoot_ Root of the merkle tree from the claims json
    /// @param uri_ Uri, usually ipfs, where the json is located
    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) external;


    /// @dev Returns the uri where claims json is located
    /// @return uri Uri, usually ipfs
    function uri() external returns ( bytes32 uri );
  
}
