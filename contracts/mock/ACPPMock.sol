// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/AccessControlProxyPausable.sol";

contract ACPPMock is AccessControlProxyPausable {

    bool public result;
    bytes32 public immutable MOCK_ROLE = keccak256("MOCK_ROLE");

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }

    function fn() public onlyRole(DEFAULT_ADMIN_ROLE) {
        result = true;
    }

    function fn2() public onlyRole(MOCK_ROLE) {
        result = true;
    }
}