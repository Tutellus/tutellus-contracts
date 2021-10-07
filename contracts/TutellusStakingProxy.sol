// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlPausableUpgradeable.sol";

contract TutellusStakingProxy is AccessControlPausableUpgradeable {

    // Initializes the contract
    function initialize() public {
      __TutellusStakingProxy_init();
    }

    function __TutellusStakingProxy_init() internal initializer {
      __AccessControlPausableUpgradeable_init();
      __TutellusStakingProxy_init_unchained();
    }

    function __TutellusStakingProxy_init_unchained() internal initializer {
    }

}