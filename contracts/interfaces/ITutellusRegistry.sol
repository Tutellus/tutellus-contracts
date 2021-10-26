// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

interface ITutellusRegistry {
    function isEmptyHash(bytes32 hash_) external view returns(bool);
    function isEmptyDID(address did_) external view returns(bool);
    function register(bytes32 hash_, address did_) external;
}