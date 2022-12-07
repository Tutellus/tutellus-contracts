// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/AccessControlProxyPausable.sol";

contract S2LV2Mock is AccessControlProxyPausable {
    function initialize(
        address manager_,
        address account_,
        address token_,
        address stakingContract_,
        uint256 priceFiat_,
        uint256 maxPriceToken_
    ) public initializer {
        (account_);
        (token_);
        (stakingContract_);
        (priceFiat_);
        (maxPriceToken_);
        __AccessControlProxyPausable_init(manager_);
    }

    function deposit(uint256 amount) public pure {
        (amount);
    }

    function s2lVersion() public pure returns (string memory) {
        return "S2L-V2";
    }
}
