// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TutellusRoleManager is AccessControlUpgradeable {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() {
        __TutellusRoleManager_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, tx.origin);
    }

    function __TutellusRoleManager_init() internal initializer {
      __AccessControl_init();
      __TutellusRoleManager_init_unchained();
    }

    function __TutellusRoleManager_init_unchained() internal initializer {
    }

    function grantAdminRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      _setupRole(DEFAULT_ADMIN_ROLE, account);
    }
    
    function grantMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      _setupRole(MINTER_ROLE, account);
    }

    function grantUpgraderRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      _setupRole(MINTER_ROLE, account);
    }

    function grantPauserRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      _setupRole(MINTER_ROLE, account);
    }

    function grantAllRoles(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      grantPauserRole(account);
      grantMinterRole(account);
      grantUpgraderRole(account);
      grantAdminRole(account);
    }
}
