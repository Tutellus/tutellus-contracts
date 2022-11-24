// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "contracts/utils/BeaconFactory.sol";

abstract contract Stake2XFactory is EIP712Upgradeable, BeaconFactory {
    struct Feed {
        address feedAddress;
        bool invert;
    }

    bytes32 internal constant _S2X_TYPEHASH =
        keccak256("Deposit(bytes32 id,uint256 deposit,uint256 price,uint256 deadline)");

    address private _token;
    address private _poolAddress;
    address private _stakingContract;

    Feed[] public feeds;

    function __Stake2XFactory_initialize(
        string memory name_,
        string memory version_,
        address token_,
        address poolAddress_,
        address stakingContract_,
        address[] memory feeds_,
        bool[] memory inverts_
    ) internal onlyInitializing {
        __EIP712_init(name_, version_);

        _token = token_;
        _poolAddress = poolAddress_;
        _stakingContract = stakingContract_;

        for (uint256 i = 0; i < feeds_.length; i++) {
            feeds.push(Feed({feedAddress: feeds_[i], invert: inverts_[i]}));
        }
    }

    function token() public view returns (address) {
        return _token;
    }

    function poolAddress() public view returns (address) {
        return _poolAddress;
    }

    function stakingContract() public view returns (address) {
        return _stakingContract;
    }

    function convertToken2Fiat(uint256 amount) public view returns (uint256) {
        return _convertToken2Fiat(amount);
    }

    function convertFiat2Token(uint256 amount) public view returns (uint256) {
        return _convertFiat2Token(amount);
    }

    function verifySignature(
        bytes32 id,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) public view returns (bool) {
        return _verifySignature(id, amount, price, deadline, signature, signer);
    }

    function _convertToken2Fiat(uint256 amount) internal view returns (uint256) {
        (uint256 reservesToken, uint256 reservesPair) = _getPoolReserves();
        uint256 reservesFiat = _convertPair2Fiat(reservesPair);
        uint256 pairDecimals = _getPairDecimals();
        return (amount * reservesFiat * 1 ether) / (reservesToken * 10 ** pairDecimals); //wei, 18 decimals
    }

    function _convertFiat2Token(uint256 amount) internal view returns (uint256) {
        uint256 rate = _convertToken2Fiat(1 ether);
        return (amount * 1 ether) / (rate); //wei, 18 decimals
    }

    function _getPairDecimals() internal view returns (uint256) {
        IUniswapV2Pair _pool = IUniswapV2Pair(_poolAddress);
        address token0 = _pool.token0();
        address pairAddress = token0 == _token ? _pool.token1() : token0;
        IERC20MetadataUpgradeable pair = IERC20MetadataUpgradeable(pairAddress);
        return pair.decimals();
    }

    function _convertPair2Fiat(uint256 amount) internal view returns (uint256) {
        for (uint256 i = 0; i < feeds.length; i++) {
            amount = _convertWithFeed(feeds[i], amount);
        }
        return amount; //pair decimals
    }

    function _getPoolReserves() internal view returns (uint256 reservesToken, uint256 reservesPair) {
        IUniswapV2Pair _pool = IUniswapV2Pair(_poolAddress);
        (uint256 reserves0, uint256 reserves1,) = _pool.getReserves();
        (reservesToken, reservesPair) = _pool.token0() == _token ? (reserves0, reserves1) : (reserves1, reserves0);
    }

    function _convertWithFeed(Feed memory feed, uint256 amount) internal view returns (uint256) {
        AggregatorV3Interface aggregatorInterface = AggregatorV3Interface(feed.feedAddress);
        uint256 decimals = aggregatorInterface.decimals(); //8
        (, int256 answer,,,) = aggregatorInterface.latestRoundData();
        return feed.invert
            ? ((amount * (10 ** decimals)) / uint256(answer))
            : ((amount * uint256(answer)) / (10 ** decimals));
    }

    function _verifySignature(
        bytes32 id,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) internal view returns (bool) {
        if (block.timestamp > deadline) return false;
        bytes32 structHash = keccak256(abi.encode(_S2X_TYPEHASH, id, amount, price, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        return SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
    }
}
