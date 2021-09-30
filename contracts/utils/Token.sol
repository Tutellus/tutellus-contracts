// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RedPillERC20.sol";

contract Token is RedPillERC20 {
    constructor(string memory name, string memory symbol, uint256 cap) {
        __RedPillERC20_init(name, symbol, cap);
    }
}