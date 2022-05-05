// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "./TutellusIDO.sol";

contract TutellusIDOFactory is UUPSUpgradeableByRole {
    address public beacon;

    event NewIDO(
        address indexed proxy,
        address token,
        uint256 fundingAmount,
        uint256 minPrefund,
        address idoToken,
        address prefundToken,
        uint256 startDate,
        uint256 endDate
    );

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);

        UpgradeableBeacon _beacon = new UpgradeableBeacon(
            address(new TutellusIDO())
        );
        beacon = address(_beacon);

        _beacon.transferOwnership(msg.sender); //Beacon upgrader
    }

    function createProxy(bytes calldata initializeCalldata)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (address proxy)
    {
        (proxy) = _createProxy(initializeCalldata);
    }

    function _createProxy(bytes calldata initializeCalldata)
        private
        whenNotPaused
        returns (address proxyAddress)
    {
        BeaconProxy proxy = new BeaconProxy(beacon, initializeCalldata);

        proxyAddress = address(proxy);

        (
            address token_,
            uint256 fundingAmount_,
            uint256 minPrefund_,
            address idoToken_,
            address prefundToken_,
            uint256 startDate_,
            uint256 endDate_
        ) = abi.decode(
                initializeCalldata[4:],
                (address, uint256, uint256, address, address, uint256, uint256)
            );

        emit NewIDO(
            proxyAddress,
            token_,
            fundingAmount_,
            minPrefund_,
            idoToken_,
            prefundToken_,
            startDate_,
            endDate_
        );
    }
}
