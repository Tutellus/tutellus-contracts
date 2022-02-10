// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "../utils/AccessControlProxyPausable.sol";
import "./TutellusIDO.sol";

contract TutellusIDOFactory is AccessControlProxyPausable{
    address public beacon;

    event NewIDO(address indexed proxy, address token, uint fundingAmount, uint minPrefundSuper, uint minPrefund);

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);

        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new TutellusIDO()));
        beacon = address(_beacon);

        _beacon.transferOwnership(msg.sender); //Beacon upgrader
    }

    function createProxy(bytes calldata initializeCalldata) public onlyRole(DEFAULT_ADMIN_ROLE) returns(address proxy) {
        (proxy) = _createProxy(initializeCalldata);
    }

    function _createProxy(bytes calldata initializeCalldata) private whenNotPaused() returns (address proxyAddress){
        BeaconProxy proxy = new BeaconProxy(
            beacon,
            initializeCalldata
        );

        proxyAddress = address(proxy);

        (address token_,uint fundingAmount_,uint minPrefundSuper_, uint minPrefund_) = abi.decode(initializeCalldata[4:], (address, uint, uint, uint));

        _registerDID(owner, proxyAddress);

        emit NewIDO(proxyAddress, token_, fundingAmount_, minPrefundSuper_, minPrefund_);
    }
}
