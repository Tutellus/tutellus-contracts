// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "contracts/interfaces/ITutellusManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title The contract of TutellusManager
/// @dev Manages smart contracts deployments, ids and protocol roles
contract TutellusManager is ITutellusManager, AccessControlUpgradeable {

    /** STORAGE */
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping(bytes32=>address) public get;
    mapping(bytes32=>bool) public locked;
    mapping(address=>bytes32) public idOf;

    /** PUBLIC METHODS */

    /// @inheritdoc ITutellusManager
    function deploy(bytes32 id, bytes memory bytecode, bytes memory initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) returns(address implementation) {
        bool upgrading;
        assembly {
            implementation := create(0, add(bytecode, 32), mload(bytecode))
        }

        address proxyAddress = get[id];

        if (proxyAddress != address(0)) {
            upgrade(id, implementation, initializeCalldata);
            upgrading = true;
        } else {
            _deployProxy(id, implementation, initializeCalldata);
        }

        emit Deployment(id, get[id], implementation, upgrading);
    }

    /// @inheritdoc ITutellusManager
    function deployProxyWithImplementation(bytes32 id, address implementation, bytes memory initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) {
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
    function lock(bytes32 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        locked[id] = true;
        emit Locked(id, get[id]);
    }

    /// @inheritdoc ITutellusManager
    function setId(bytes32 id, address addr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "TutellusManager: id locked");
        get[id] = addr;
        idOf[addr] = id;

        emit NewId(id, addr);
    }

    /// @inheritdoc ITutellusManager
    function upgrade(bytes32 id, address implementation, bytes memory initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) {
        UUPSUpgradeable proxy = UUPSUpgradeable(payable(get[id]));
        if (initializeCalldata.length > 0) {
            proxy.upgradeToAndCall(implementation, initializeCalldata);
        } else {
            proxy.upgradeTo(implementation);
        }
    }

    /** PRIVATE METHODS */

    function _deployProxy(bytes32 id, address implementation, bytes memory initializeCalldata) private {
        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initializeCalldata
        );
        get[id] = address(proxy);
        idOf[address(proxy)] = id;
    }

}