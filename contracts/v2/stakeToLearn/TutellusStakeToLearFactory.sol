// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusStaking.sol";
import {TutellusStakeToLearn} from "./TutellusStakeToLearn.sol";

contract TutellusStakeToLearnFactory is UUPSUpgradeableByRole, EIP712Upgradeable {
    bytes32 internal constant _TUTELLUS_STAKETOLEARN_TYPEHASH =
        keccak256(
            "StakeToLearn(address account,uint256 price,uint256 anualInterestPercentage,uint256 amount,uint256 deadline)"
        );
    bytes32 private immutable TUTELLUS_STAKETOLEARN_ADMIN_ROLE = keccak256("TUTELLUS_STAKETOLEARN_ADMIN_ROLE");
    bytes32 private immutable TUTELLUS_STAKETOLEARN_SIGNER = keccak256("TUTELLUS_STAKETOLEARN_SIGNER");

    address private _stakingAddress;
    address private _feedBtcUsd;
    address private _tutAddress;
    address private _btcAddress;
    address private _poolAddress;
    address public fixedImplementation;

    event NewStakeToLear(address indexed proxy, address indexed account, uint price, uint anualInterestPercentage, uint depositAmount);
    event NewImplementation(address implementation);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address account,
        address stakingAddress,
        address feedBtcUsd,
        address tutAddress,
        address btcAddress,
        address poolAddress
    ) public initializer {
        __AccessControlProxyPausable_init(msg.sender); //TBD: not msg.sender
        __EIP712_init("TutellusStakeToLearnFactory", "1");
        fixedImplementation = address(new TutellusStakeToLearn());

        _stakingAddress = stakingAddress;
        _feedBtcUsd = feedBtcUsd;
        _tutAddress = tutAddress;
        _btcAddress = btcAddress;
        _poolAddress = poolAddress;
    }

    function updateImplementation(address newImplementation) public onlyRole(TUTELLUS_STAKETOLEARN_ADMIN_ROLE) {
        fixedImplementation = newImplementation;
        emit NewImplementation(newImplementation);
    }

    function createProxy(
        uint depositAmount,
        uint price,
        uint anualInterestPercentage,
        uint deadline,
        bytes memory signature,
        address signer
    ) public returns(address proxy) {
        address account = msg.sender;
        hasRole(TUTELLUS_STAKETOLEARN_SIGNER, signer);
        _verifySignature(account, price, anualInterestPercentage, depositAmount, deadline, signature, signer);
        proxy = _createProxy(
            fixedImplementation,
            account,
            price,
            anualInterestPercentage,
            depositAmount
        );

        IERC20(_tutAddress).transferFrom(account, proxy, depositAmount);
    }

    function _createProxy(
        address implementation,
        address account,
        uint price,
        uint anualInterestPercentage,
        uint depositAmount
    ) private whenNotPaused returns (address proxyAddress) {
        bytes memory initializeCalldata = abi.encodeWithSelector(
            TutellusStakeToLearn.initialize.selector, 
            account,
            depositAmount,
            _stakingAddress,
            _feedBtcUsd,
            _tutAddress,
            _btcAddress,
            _poolAddress,
            price,
            anualInterestPercentage,
            depositAmount
        );

        proxyAddress = address(new ERC1967Proxy(
            implementation,
            initializeCalldata
        ));

        emit NewStakeToLear(
            proxyAddress,
            account,
            price,
            anualInterestPercentage,
            depositAmount
        );
    }

    function _verifySignature(
        address account,
        uint price,
        uint anualInterestPercentage,
        uint depositAmount,
        uint deadline, 
        bytes memory signature, 
        address signer
    ) internal returns(bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                _TUTELLUS_STAKETOLEARN_TYPEHASH,
                account,
                price,
                anualInterestPercentage,
                depositAmount,
                deadline
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);

        return SignatureCheckerUpgradeable.isValidSignatureNow(
            signer,
            hash,
            signature
        );
    }
}