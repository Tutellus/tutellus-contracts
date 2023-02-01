// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "contracts/utils/BeaconFactory.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "./ITutellusStake2Learn.sol";

abstract contract TutellusStake2LearnFactory is EIP712Upgradeable, BeaconFactory, UUPSUpgradeableByRole {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 internal constant _S2X_TYPEHASH = keccak256("Deposit(bytes32 id,uint256 price,uint256 deadline)");
    bytes32 internal constant _S2L_SIGNER_ROLE = keccak256("S2L_SIGNER_ROLE");

    struct Feed {
        address feedAddress;
        bool invert;
    }

    address private _token;
    address private _poolAddress;

    Feed[] public feeds;

    event CreateS2L( //TBD: Rename to maxPriceToken
        bytes32 indexed id,
        address indexed account,
        address indexed proxy,
        uint256 deposit,
        uint256 price,
        uint256 maxTokenPrice
    );

    function initialize(
        address implementation_,
        address token_,
        address poolAddress_,
        address[] memory feeds_,
        bool[] memory inverts_
    ) public initializer {
        __EIP712_init("TUT_S2L", "1");
        __AccessControlProxyPausable_init(msg.sender);
        _upgradeByImplementation(implementation_);

        _token = token_;
        _poolAddress = poolAddress_;

        for (uint256 i = 0; i < feeds_.length; i++) {
            feeds.push(Feed({feedAddress: feeds_[i], invert: inverts_[i]}));
        }
    }

    function payReceiver() public view returns (address) {
        return ITutellusManager(config).get(keccak256("S2L_RECEIVER"));
    }

    function createS2L(
        bytes32 id,
        uint256 amount,
        uint256 priceFiat,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) external returns (address) {
        require(hasRole(_S2L_SIGNER_ROLE, signer), "TUTS2L002");
        require(_verifySignature(id, priceFiat, deadline, signature, signer), "TUTS2L003");
        address account = msg.sender;
        uint256 maxPriceToken = _convertFiat2Token(priceFiat);
        require(amount >= maxPriceToken, "TUTS2L004");
        bytes memory initializeCalldata =
            abi.encodeWithSelector(ITutellusStake2Learn.initialize.selector, account, _token, priceFiat, maxPriceToken);
        address proxy = _createProxy(initializeCalldata);
        IERC20Upgradeable(_token).safeTransferFrom(account, proxy, amount);
        ITutellusStake2Learn(proxy).deposit(amount);
        emit CreateS2L(id, account, proxy, amount, priceFiat, maxPriceToken);
        return proxy;
    }

    //override required by Stake2XFactory
    function _canUpgradeByImplementation(address implementation, address sender) internal view returns (bool) {
        (implementation);
        return hasRole(UPGRADER_ROLE, sender);
    }

    function token() public view returns (address) {
        return _token;
    }

    function poolAddress() public view returns (address) {
        return _poolAddress;
    }

    function convertToken2Fiat(uint256 amount) public view returns (uint256) {
        return _convertToken2Fiat(amount);
    }

    function convertFiat2Token(uint256 amount) public view returns (uint256) {
        return _convertFiat2Token(amount);
    }

    function verifySignature(bytes32 id, uint256 price, uint256 deadline, bytes memory signature, address signer)
        public
        view
        returns (bool)
    {
        return _verifySignature(id, price, deadline, signature, signer);
    }

    function upgradeByImplementation(address implementation) public {
        require(_canUpgradeByImplementation(implementation, msg.sender), "S2X003");
        _upgradeByImplementation(implementation);
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

    function _verifySignature(bytes32 id, uint256 price, uint256 deadline, bytes memory signature, address signer)
        internal
        view
        returns (bool)
    {
        if (block.timestamp > deadline) return false;
        bytes32 structHash = keccak256(abi.encode(_S2X_TYPEHASH, id, price, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        return SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
    }
}
