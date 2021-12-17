// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CreatePairEvent is Ownable {
    event CreatePairs();

    function create() public onlyOwner {
        emit CreatePairs();
    }
}