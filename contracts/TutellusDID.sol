// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
//import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract TutellusDID is Initializable, AccessControlUpgradeable/*, UUPSUpgradeable*/ {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    //bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    function initialize(address proxyOwner) initializer public {
        __AccessControl_init();
        //__UUPSUpgradeable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, proxyOwner);
        _setupRole(OWNER_ROLE, proxyOwner);
    }

    /*function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}*/

    function version() public pure returns(string memory) {
        return "v0.0.1";
    }
}