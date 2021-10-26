// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

interface ITutellusController {
    function getAddress(bytes32 id) external view returns(address);
    function isVerified(address addr) external view returns(bool);
}