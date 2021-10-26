// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./TutellusDIDFactory.sol";
import "./TutellusDIDRegistry.sol";

contract TutellusController is AccessControlUpgradeable {
    bytes32 public constant TUT_MANAGER_ROLE = keccak256("TUT_MANAGER_ROLE");

    mapping(bytes32 => address) private _addresses;
    mapping(bytes32 => bool) private _lockedIds;
    mapping(address => bool) private _verified;

    event SetAddress(bytes32 id, address addr, address sender);
    event LockId(bytes32 id, address sender);
    event SetVerification(address addr, bool verified, address sender);

    constructor() {
        //setup roles
        _setupRole(TUT_MANAGER_ROLE, msg.sender);

        //deploy core
        TutellusDIDFactory factory = new TutellusDIDFactory(address(this));
        bytes32 factoryId = keccak256("TUT_DID_FACTORY");
        _addresses[factoryId] = address(factory);

        TutellusDIDRegistry registry = new TutellusDIDRegistry(address(this));
        bytes32 registryId = keccak256("TUT_DID_REGISTRY");
        _addresses[registryId] = address(registry);
    }

    function getAddress(bytes32 id) public view returns(address) {
        return _addresses[id];
    }

    function isVerified(address addr) public view returns(bool) {
        return _verified[addr];
    }

    function setAddress(bytes32 id, address addr) public onlyRole(TUT_MANAGER_ROLE) {
        require(!_lockedIds[id], "TutellusController: ID is locked");
        _addresses[id] = addr;
        _verified[addr] = true;

        emit SetAddress(id, addr, _msgSender());
    }

    function lockId(bytes32 id) public onlyRole(TUT_MANAGER_ROLE) {
        _lockedIds[id] = true;

        emit LockId(id, _msgSender());
    }

    function setVerification(address addr, bool verified) public onlyRole(TUT_MANAGER_ROLE) {
        _verified[addr] = verified;

        emit SetVerification(addr, verified, _msgSender());
    }
}