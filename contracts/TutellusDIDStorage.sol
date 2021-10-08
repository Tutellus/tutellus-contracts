// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "./TutellusController.sol";

contract TutellusDIDStorage {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");

    TutellusController public controller;
    bool public onlyVerifiedCalls;
    uint256[50] private __gap;
}