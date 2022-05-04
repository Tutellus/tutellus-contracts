// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AccessControlProxyPausable.sol";

contract AdminRoleProxy is AccessControlProxyPausable {

    bytes32 public extRole;

    function initialize(address manager, bytes32 role) public initializer {
        __AdminRoleProxy_init(manager, role);
    }

    function __AdminRoleProxy_init(address manager, bytes32 role) internal initializer {
        __AdminRoleProxy_init_unchained(role);
        __AccessControlProxyPausable_init(manager);
    }

    function __AdminRoleProxy_init_unchained(bytes32 role) internal initializer {
        extRole = role;
    }

    function hasRole(bytes32 role, address account) public view override returns (bool){
        if (role == DEFAULT_ADMIN_ROLE) {
            return super.hasRole(extRole, account);
        } else {
            return super.hasRole(role, account);
        }
    }

    function updateRole(bytes32 role) public onlyRole(DEFAULT_ADMIN_ROLE) {
        extRole = role;
    }

}