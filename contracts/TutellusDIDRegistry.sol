// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./interfaces/ITutellusController.sol";

contract TutellusDIDRegistry {
    bytes32 public constant TUT_DID_FACTORY = keccak256("TUT_DID_FACTORY");

    ITutellusController private _controller;

    mapping(bytes32 => address) public didByHash;
    mapping(address => bytes32) public hashByDid;

    modifier onlyDIDFactory() {
        require(_isDIDFactory(msg.sender), "TutellusDIDRegistry: no DID Factory");
        _;
    }

    constructor(address controller_) {
        _controller = ITutellusController(controller_);
    }

    function register(bytes32 hash_, address did_) public onlyDIDFactory() {
        require((isEmptyHash(hash_)) && (isEmptyDID(did_)), "TutellusDIDRegistry: No empty");
        
        didByHash[hash_] = did_;
        hashByDid[did_] = hash_;
    }

    function isEmptyHash(bytes32 hash_) public view returns(bool) {
        return didByHash[hash_] == address(0);
    }

    function isEmptyDID(address did_) public view returns(bool) {
        return hashByDid[did_] == bytes32(0);
    }

    function _isDIDFactory(address sender_) internal view returns(bool) {
        return sender_ == _controller.getAddress(TUT_DID_FACTORY);
    }
}