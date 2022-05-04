// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./AccessControlProxyPausable.sol";

contract RoleProxy is AccessControlProxyPausable {

    mapping(bytes32=>bytes32) public roleMap;

    function initialize(address manager) public initializer {
        __AccessControlProxyPausable_init(manager);
    }

    function hasRole(bytes32 role, address account) public view override returns (bool){
        return super.hasRole(
            roleMap[role],
            account
        );
    }

    function mapRole(bytes32 from, bytes32 to) public onlyRole(DEFAULT_ADMIN_ROLE) {
        roleMap[from] = to;
    }
}