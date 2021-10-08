// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/Token.sol";

contract TutellusToken is Token {
    constructor() Token('Tutellus Token', 'TUT', 2e26) {
        // mint 400k to treasury
    }
}