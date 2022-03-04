// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TutellusManager is AccessControlUpgradeable {
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping(bytes32=>address) public get;
    mapping(address=>bytes32) public name;
    mapping(bytes32=>bool) public locked;

    event NewId(bytes32 indexed id, address addr);
    event Deployment(bytes32 indexed id, address indexed proxy, address implementation, bool upgrade);
    event Locked(bytes32 indexed id, address addr);

    function initialize() public initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
        _setupRole(UPGRADER_ROLE, address(this));
    }

    function setId(bytes32 id, address addr) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "TutellusManager: id locked");
        get[id] = addr;
        name[addr] = id;

        emit NewId(id, addr);
    }

    function deployProxyWithImplementation(bytes32 id, address implementation, bytes memory initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "TutellusManager: id locked");
        _deployProxy(id, implementation, initializeCalldata);

        emit Deployment(id, get[id], implementation, false);
    }

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

    function upgrade(bytes32 id, address implementation, bytes memory initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) {
        UUPSUpgradeable proxy = UUPSUpgradeable(payable(get[id]));
        if (initializeCalldata.length > 0) {
            proxy.upgradeToAndCall(implementation, initializeCalldata);
        } else {
            proxy.upgradeTo(implementation);
        }
    }

    function _deployProxy(bytes32 id, address implementation, bytes memory initializeCalldata) private {
        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initializeCalldata
        );
        get[id] = address(proxy);
        name[address(proxy)] = id;
    }

    function lock(bytes32 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        locked[id] = true;
        emit Locked(id, get[id]);
    }
} 