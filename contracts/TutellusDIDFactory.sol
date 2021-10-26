// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./interfaces/ITutellusController.sol";
import "./interfaces/ITutellusRegistry.sol";
import "./TutellusDID.sol";

contract TutellusDIDFactory is EIP712 {
    address public beacon;
    ITutellusController private _controller;

    bytes32 public constant TUT_DID_REGISTRY = keccak256("TUT_DID_REGISTRY");

    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _DID_FACTORY_TYPEHASH =
        keccak256("CreateProxy(bytes initializeCalldata,uint256 deadline)");

    event NewDID(address proxy /* DID's initialize args */);

    constructor(address controller_) EIP712("TUT_DID_FACTORY", "1") {
        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new TutellusDID()));
        beacon = address(_beacon);
        _beacon.transferOwnership(msg.sender); //Beacon upgrader
        _controller = ITutellusController(controller_);
    }

    function createProxy(bytes calldata initializeCalldata) public returns(address) {
        BeaconProxy proxy = new BeaconProxy(
            beacon,
            initializeCalldata
        );

        emit NewDID(address(proxy) /* DID's initialize args */);
        
        return address(proxy);
    }

    function createProxy(
        bytes calldata initializeCalldata, 
        uint deadline,
        bytes memory signature
    ) public returns(address) {
        require(block.timestamp <= deadline, "TutellusDIDFactory: expired deadline");

        bytes32 structHash = keccak256(abi.encode(_DID_FACTORY_TYPEHASH, initializeCalldata, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = address(0); //TBD

        bool validation = SignatureChecker.isValidSignatureNow(signer, hash, signature);
        require(validation, "TutellusDIDFactory: invalid signature");
        
        BeaconProxy proxy = new BeaconProxy(
            beacon,
            initializeCalldata
        );

        emit NewDID(address(proxy) /* DID's initialize args */);
        
        return address(proxy);
    }

    function _registerDID(address proxy_, bytes32 hash_) private {
        ITutellusRegistry registry = ITutellusRegistry(_controller.getAddress(TUT_DID_REGISTRY));
        registry.register(hash_, proxy_);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}