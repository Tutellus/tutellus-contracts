// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./TutellusERC20.sol";

contract Token is TutellusERC20 {
    constructor(string memory name, string memory symbol, uint256 cap) {
        __TutellusERC20_init(name, symbol, cap);
    }
}