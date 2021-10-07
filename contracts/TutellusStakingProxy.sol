// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlProxyPausable.sol";

contract TutellusStakingProxy is AccessControlProxyPausable {

    // Initializes the contract
    function initialize(address rolemanager) public {
      __TutellusStakingProxy_init(rolemanager);
    }

    function __TutellusStakingProxy_init(address rolemanager) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __TutellusStakingProxy_init_unchained();
    }

    function __TutellusStakingProxy_init_unchained() internal initializer {
    }

}