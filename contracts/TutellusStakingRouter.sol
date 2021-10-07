// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlProxyPausable.sol";

contract TutellusStakingRouter is AccessControlProxyPausable {

    // Initializes the contract
    function initialize(address rolemanager) public {
      __TutellusStakingRouter_init(rolemanager);
    }

    function __TutellusStakingRouter_init(address rolemanager) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusStakingRouter_init_unchained();
    }

    function __TutellusStakingRouter_init_unchained() internal initializer {
    }

}