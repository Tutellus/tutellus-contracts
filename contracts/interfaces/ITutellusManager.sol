// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

/// @title The interface of TutellusManager
/// @notice Manages smart contracts deployments, ids and protocol roles
interface ITutellusManager is IAccessControlUpgradeable {

    /** EVENTS */

    /// @notice Emitted when a new link is set between id and addr
    /// @param id Hashed identifier linked to proxy
    /// @param proxy Proxy contract address
    /// @param implementation Implementation contract address
    /// @param upgrade Flag: true when the proxy implementation is upgraded
    event Deployment(
        bytes32 indexed id,
        address indexed proxy,
        address indexed implementation,
        bool upgrade
    );

    /// @notice Emitted when an identifier is locked forever to an address
    /// @param id Hashed identifier linked to addr
    /// @param addr Address linked to id
    event Locked(
        bytes32 indexed id,
        address indexed addr
    );

    /// @notice Emitted when a new link is set between id and addr
    /// @param id Hashed identifier linked to addr
    /// @param addr Address linked to id
    event NewId(
        bytes32 indexed id,
        address indexed addr
    );

    /// @notice Emitted when verification state is updated
    /// @param addr Address of the verification updated
    /// @param verified New verification state
    /// @param sender Address of the transaction sender
    event SetVerification(
        address indexed addr,
        bool indexed verified,
        address indexed sender
    );

    /** METHODS */

    /// @notice Deploys / upgrades a proxy contract by deploying a new implementation
    /// @param id Hashed identifier linked to the proxy contract
    /// @param bytecode Bytecode for the new implementation
    /// @param initializeCalldata Calldata for the initialization of the new contract (if necessary)
    /// @return implementation Address of the new implementation
    function deploy(
        bytes32 id,
        bytes memory bytecode,
        bytes memory initializeCalldata
    ) external returns ( address implementation );

    /// @notice Deploys / overwrites a proxy contract with an existing implementation 
    /// @param id Hashed identifier linked to the proxy contract
    /// @param implementation Address of the existing implementation contract
    /// @param initializeCalldata Calldata for the initialization of the new contract (if necessary)
    function deployProxyWithImplementation(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) external;

    /// @notice Initializes the manager and sets necessary roles
    function initialize() external;

    /// @notice Locks immutably a link between an address and an id
    /// @param id Hashed identifier linked to the proxy contract
    function lock(
        bytes32 id
    ) external;

    /// @notice Returns whether a hashed identifier is locked or not
    /// @param id Hashed identifier linked to the proxy contract
    /// @return isLocked A boolean: true if locked, false if not
    function locked(
        bytes32 id
    ) external returns ( bool isLocked );

    /// @notice Returns the address linked to a hashed identifier
    /// @param id Hashed identifier
    /// @return addr Address linked to id
    function get(
        bytes32 id
    ) external view returns ( address addr );

    /// @notice Returns the hashed identifier linked to an address
    /// @param addr Address
    /// @return id Hashed identifier linked to addr
    function idOf(
        address addr
    ) external view returns ( bytes32 id );

    /// @notice Returns the implementation of the proxy
    /// @param proxy Proxy address
    /// @return implementation Implementation of the proxy
    function implementationByProxy(
        address proxy
    ) external view returns ( address implementation );

    /// @notice Returns whether an address is verified
    /// @param addr Address
    /// @return verified State of verification
    function isVerified(
        address addr
    ) external view returns ( bool verified );

    /// @notice Sets a link between a hashed identifier and an address
    /// @param id Hashed identifier
    /// @param addr Address
    function setId(
        bytes32 id,
        address addr
    ) external;

    /// @notice Sets a new verification state to an address
    /// @param addr Address
    /// @param verified New verification state
    function setVerification(
        address addr,
        bool verified
    ) external;

    /// @notice Upgrades a proxy contract with an existing implementation 
    /// @param id Hashed identifier linked to the proxy contract
    /// @param implementation Address of the existing implementation contract
    /// @param initializeCalldata Calldata for the initialization of the new contract (if necessary)
    function upgrade(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) external;

    /// @notice Returns upgrader role hashed identifier
    /// @return role Hashed string of UPGRADER_ROLE
    function UPGRADER_ROLE() external returns ( bytes32 role );

}