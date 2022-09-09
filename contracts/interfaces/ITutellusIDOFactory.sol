// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusIDOFactory {

    /// @notice Emitted when a new IDO is deployed
    /// @param proxy Address of the proxy
    /// @param roleManager Address of AccessControl contract
    /// @param fundingAmount Amount needed by the project
    /// @param minPrefund Minimum amount for a prefunder to participate
    /// @param idoToken Address of the project token
    /// @param prefundToken Address of the token to prefund
    /// @param startDate Vesting start time date
    /// @param endDate Vesting end time date
    /// @param openDate Open time for IDO
    event NewIDO(
        address indexed proxy,
        address roleManager,
        uint256 fundingAmount,
        uint256 minPrefund,
        address idoToken,
        address prefundToken,
        uint256 startDate,
        uint256 endDate,
        uint256 openDate
    );

    /// @notice Emitted when fixedImplementation is updated
    /// @param implementation Address of the new implementation
    event NewImplementation(address implementation);

    /// @notice Emitted when merkleRoot and uri of an IDO is updated
    /// @param ido IDO to updateMerkleRoot
    /// @param merkleRoot Root hash of the merkle tree
    /// @param uri IPFS CID (ipfs://<CID>)
    event UpdateMerkleRoot(address ido, bytes32 merkleRoot, string uri);

    /// @notice Emitted when an IDO is closed
    /// @param ido IDO to updateMerkleRoot
    event CloseIDO(address ido);

    /// @notice Deploy a new IDO
    /// @dev Deploy a proxy whose implementation is fixedImplementation
    /// @param initializeCalldata Encoded TutellusIDO.initialize call data
    /// @return proxy Address of the proxy
    function createProxy(bytes calldata initializeCalldata)
        external
        returns (address proxy);

    /// @notice Deploy a new IDO
    /// @dev Deploy a proxy whose implementation is a custom contract
    /// @param implementation Address of the custom implementation
    /// @param initializeCalldata Encoded TutellusIDO.initialize call data
    /// @return proxy Address of the proxy
    function createProxyWithCustomImplementation(
        address implementation,
        bytes calldata initializeCalldata
    ) external returns (address proxy);

    /// @notice Returns address of the implementation contract for IDOs
    /// @return fixedImplementation
    function fixedImplementation() external view returns (address);

    /// @notice Initializes proxy
    function initialize() external;

    /// @notice Updates address of the fixedImplementation
    /// @param newImplementation Address of the new implementation
    function updateImplementation(address newImplementation) external;

    /// @notice Update merkle root in IDO
    /// @param ido IDO to updateMerkleRoot
    /// @param merkleRoot Root hash of the merkle tree
    /// @param uri IPFS CID (ipfs://<CID>)
    function updateMerkleRoot(
        address ido,
        bytes32 merkleRoot,
        string calldata uri
    ) external;

    /// @notice Close an IDO
    /// @param ido IDO to updateMerkleRoot
    function closeIDO(address ido) external;
}
