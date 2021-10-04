// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TutellusDIDV2 is Initializable, AccessControlUpgradeable {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    function initialize(address proxyOwner) initializer public {
        __AccessControl_init();

        _setupRole(DEFAULT_ADMIN_ROLE, proxyOwner);
        _setupRole(OWNER_ROLE, proxyOwner);
    }

    function version() public pure returns(string memory) {
        return "v0.0.2";
    }
}