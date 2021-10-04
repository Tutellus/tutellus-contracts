// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./TutellusDID.sol";

contract TutellusDIDFactory {
    address public beacon;

    event NewDID(address proxy /* DID's initialize args */);

    constructor() {
        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new TutellusDID()));
        beacon = address(_beacon);
        _beacon.transferOwnership(msg.sender); //Beacon upgrader
    }

    function createProxy(bytes calldata initializeCalldata) public returns(address) {
        BeaconProxy proxy = new BeaconProxy(
            beacon,
            initializeCalldata
        );

        emit NewDID(address(proxy) /* DID's initialize args */);
        
        return address(proxy);
    }
}