// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TutellusRoleManager is AccessControlUpgradeable {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address private _deployer;

    constructor(address deployer) {
        _deployer = deployer;
        __TutellusRoleManager_init();
        _setupRole(DEFAULT_ADMIN_ROLE, _deployer);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function __TutellusRoleManager_init() internal initializer {
      __AccessControl_init();
      __TutellusRoleManager_init_unchained();
    }

    function __TutellusRoleManager_init_unchained() internal initializer {
    }
}
