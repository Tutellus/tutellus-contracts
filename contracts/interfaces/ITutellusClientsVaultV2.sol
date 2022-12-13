// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title The interface of TutellusClientsVaultV2
/// @notice Manages clients rewards with a efficient distribution using merkle trees verification
interface ITutellusClientsVaultV2 {

    /** METHODS */

    /// @notice Returns the amount already claimed by an account
    /// @param account Address of the claimer
    /// @return amount Amount already claimed by the claimer
    function alreadyClaimed(address account) external returns ( uint256 amount );

    /// @notice Claims the claimable amount for an account
    /// @param index Position of the account in the original json
    /// @param account Address of the claimer
    /// @param amount Original amount from the json
    /// @param merkleProof Array of hashes, generated in the merkle tree genesis 
    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;

    /// @notice Initializes the vault
    function initialize() external;

    /// @notice Returns the claimable amount for an address
    /// @param index Position of the account in the original json
    /// @param account Address of the claimer
    /// @param amount Original amount from the json
    /// @param merkleProof Array of hashes, generated in the merkle tree genesis 
    /// @return claimable Claimable amount for the claimer address
    function leftToClaim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external view returns( uint256 claimable );

    /// @notice Returns the merkle root, which serves to verify claims
    /// @return merkleRoot Root of the merkle tree from the claims json
    function merkleRoot() external returns ( bytes32 merkleRoot );

    /// @notice Updates merkleRoot and uri
    /// @param merkleRoot_ Root of the merkle tree from the claims json
    /// @param uri_ Uri, usually ipfs, where the json is located
    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) external;


    /// @notice Returns the uri where claims json is located
    /// @return uri Uri, usually ipfs
    function uri() external returns ( string memory uri );
  
}
