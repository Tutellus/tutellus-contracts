// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "./TutellusIDO.sol";

contract TutellusIDOFactory is UUPSUpgradeableByRole{
    address public beacon;

    event NewIDO(address indexed proxy, address token, uint fundingAmount, uint minPrefund);

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

        (,address token_,uint fundingAmount_, uint minPrefund_) = abi.decode(initializeCalldata[4:], (address, address, uint, uint));

        emit NewIDO(proxyAddress, token_, fundingAmount_, minPrefund_);
    }
}
