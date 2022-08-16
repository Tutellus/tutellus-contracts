// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "contracts/libraries/Contracts.sol";
import "contracts/libraries/Msg.sol";

abstract contract BeaconFactory {

    address public beacon;

    modifier isBeaconSet {
        require(_beaconSet(), "BeaconFactory: beacon is not set yet");
        _;
    }

    function _beaconSet () internal view returns (bool) {
        return Contracts.isContract(beacon);
    }

    function _upgradeByBytecode(bytes memory bytecode) internal returns (address implementation) {
        implementation = Contracts.deploy(bytecode);
        _upgradeByImplementation(implementation);
    }

    function _upgradeByImplementation(address implementation) internal {
        if (_beaconSet()) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, bytes memory result) = beacon.call(abi.encodeWithSignature("upgradeTo(address)", implementation));
            require(success, Msg.getRevertMsg(result));
        } else {
            beacon = address(new UpgradeableBeacon(implementation));
        }
    }

    function _createProxy(bytes memory initializeCalldata) internal isBeaconSet returns (address) {
        BeaconProxy proxy = new BeaconProxy(
            beacon,
            initializeCalldata
        );

        return address(proxy);
    }
}