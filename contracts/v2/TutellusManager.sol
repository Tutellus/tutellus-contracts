// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "contracts/libraries/Contracts.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title The contract of TutellusManager
/// @notice Manages smart contracts deployments, ids and protocol roles
contract TutellusManager is ITutellusManager, AccessControlUpgradeable {

    /** STORAGE */
    
    /// @inheritdoc ITutellusManager
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @inheritdoc ITutellusManager
    mapping(bytes32 => address) public get;

    /// @inheritdoc ITutellusManager
    mapping(bytes32 => bool) public locked;

    /// @inheritdoc ITutellusManager
    mapping(address => bytes32) public idOf;

    /// @inheritdoc ITutellusManager
    mapping(address => bool) public isVerified;

    /// @inheritdoc ITutellusManager
    mapping(address => address) public implementationByProxy;

    /** PUBLIC METHODS */

    /// @inheritdoc ITutellusManager
    function deploy(
        bytes32 id,
        bytes memory bytecode,
        bytes memory initializeCalldata
    ) public onlyRole(DEFAULT_ADMIN_ROLE) returns(address implementation) {
        implementation = Contracts.deploy(bytecode);

        address proxyAddress = get[id];

        if (proxyAddress != address(0)) {
            upgrade(id, implementation, initializeCalldata);
            emit Deployment(id, get[id], implementation, true);
        } else {
            _deployProxy(id, implementation, initializeCalldata);
            emit Deployment(id, get[id], implementation, false);
        }
    }

    /// @inheritdoc ITutellusManager
    function deployProxyWithImplementation(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "TutellusManager: id locked");
        _deployProxy(id, implementation, initializeCalldata);

        emit Deployment(id, get[id], implementation, false);
    }

    /// @inheritdoc ITutellusManager
    function initialize() public initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
        _setupRole(UPGRADER_ROLE, address(this));
    }

    /// @inheritdoc ITutellusManager
    function lock(
        bytes32 id
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        locked[id] = true;
        emit Locked(id, get[id]);
    }

    /// @inheritdoc ITutellusManager
    function setId(
        bytes32 id,
        address addr
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "TutellusManager: id locked");
        get[id] = addr;
        idOf[addr] = id;
        isVerified[addr] = true;

        emit NewId(id, addr);
    }

    /// @inheritdoc ITutellusManager
    function setVerification(
        address addr,
        bool verified
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        isVerified[addr] = verified;
        emit SetVerification(addr, verified, msg.sender);
    }

    /// @inheritdoc ITutellusManager
    function upgrade(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        UUPSUpgradeable proxy = UUPSUpgradeable(payable(get[id]));
        if (initializeCalldata.length > 0) {
            proxy.upgradeToAndCall(implementation, initializeCalldata);
        } else {
            proxy.upgradeTo(implementation);
        }
        implementationByProxy[address(proxy)] = implementation;
    }

    /** PRIVATE METHODS */

    function _deployProxy(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) private {
        address proxy = address(new ERC1967Proxy(
            implementation,
            initializeCalldata
        )); 
        get[id] = proxy;
        idOf[proxy] = id;
        isVerified[proxy] = true;
        implementationByProxy[proxy] = implementation;
    }

}