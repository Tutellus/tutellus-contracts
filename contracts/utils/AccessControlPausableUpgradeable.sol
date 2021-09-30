// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

abstract contract AccessControlPausableUpgradeable is AccessControlUpgradeable, PausableUpgradeable {

    bytes32 internal PAUSER_ROLE = keccak256('PAUSER_ROLE');
    /**
     * @dev Initialized the contract.
     *
     * Requirements:
     *
     * - the contract must be not initialized.
     */

    function __AccessControlPausableUpgradeable_init() internal initializer {
        __AccessControl_init();
        __Pausable_init();
        __AccessControlPausableUpgradeable_init_unchained();
    }

    function __AccessControlPausableUpgradeable_init_unchained() internal initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
    }

    function grantPauserRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE){
        _setupRole(PAUSER_ROLE, account);
    }

    function pause() public onlyRole(PAUSER_ROLE){
        _pause();
    }
    
    function unpause() public onlyRole(PAUSER_ROLE){
        _unpause();
    }
}