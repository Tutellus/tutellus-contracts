// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./TutellusDIDFactory.sol";

contract TutellusController is AccessControlUpgradeable {
    bytes32 public constant ADDR_MANAGER_ROLE = keccak256("ADDR_MANAGER_ROLE");

    mapping(bytes32 => address) private _addresses;
    mapping(bytes32 => bool) private _lockedIds;
    mapping(address => bool) private _verified;

    event SetAddress(bytes32 id, address addr, address sender);
    event LockId(bytes32 id, address sender);
    event SetVerification(address addr, bool verified, address sender);

    constructor() {
        //setup roles
        _setupRole(ADDR_MANAGER_ROLE, msg.sender);

        //deploy core
        TutellusDIDFactory factory = new TutellusDIDFactory();
        bytes32 factoryId = keccak256("DID_FACTORY_ADDR");
        _addresses[factoryId] = address(factory);
    }

    function getAddress(bytes32 id) public view returns(address) {
        return _addresses[id];
    }

    function isVerified(address addr) public view returns(bool) {
        return _verified[addr];
    }

    function setAddress(bytes32 id, address addr) public onlyRole(ADDR_MANAGER_ROLE) {
        require(!_lockedIds[id], "TutellusController: ID is locked");
        _addresses[id] = addr;
        _verified[addr] = true;

        emit SetAddress(id, addr, _msgSender());
    }

    function lockId(bytes32 id) public onlyRole(ADDR_MANAGER_ROLE) {
        _lockedIds[id] = true;

        emit LockId(id, _msgSender());
    }

    function setVerification(address addr, bool verified) public onlyRole(ADDR_MANAGER_ROLE) {
        _verified[addr] = verified;

        emit SetVerification(addr, verified, _msgSender());
    }
}