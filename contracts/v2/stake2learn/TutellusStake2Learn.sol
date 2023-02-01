// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./TutellusStake2LearnFactory.sol";

abstract contract TutellusStake2Learn is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    TutellusStake2LearnFactory private _factory;
    IERC20Upgradeable private _token;
    uint256 private _priceFiat;
    uint256 private _maxPriceToken;
    uint256 private _depositTime;
    uint256 private _apr;

    event Deposit(address indexed owner, uint256 amount);
    event Claim(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, address receiver, uint256 left, uint256 payment);

    function initialize(address account_, address token_, uint256 priceFiat_, uint256 maxPriceToken_)
        public
        initializer
    {
        __Ownable_init();
        _transferOwnership(account_);

        _token = IERC20Upgradeable(token_);
        _factory = TutellusStake2LearnFactory(msg.sender);
        _priceFiat = priceFiat_;
        _maxPriceToken = maxPriceToken_;
    }

    function token() public view returns (address) {
        return address(_token);
    }

    function factory() public view returns (address) {
        return address(_factory);
    }

    function priceFiat() public view returns (uint256) {
        return _priceFiat;
    }

    function maxPriceToken() public view returns (uint256) {
        return _maxPriceToken;
    }

    function payAmount() public view returns (uint256) {
        return _payAmount();
    }

    function deposited() public view returns (uint256) {
        return _contractBalance();
    }

    //we assume funds are transfered by factory before deposit call
    function deposit(uint256 amount) public virtual {
        require(msg.sender == address(_factory), ""); //TODO: check
        require(amount == _token.balanceOf(address(this)), "");
        require(_depositTime == 0, "");
        _depositTime = block.timestamp;
    }

    function withdraw() public onlyOwner {
        address to = _payReceiver();
        uint256 payment = _payAmount() - _claimable();
        _token.safeTransfer(to, payment);
        uint256 left = _contractBalance();
        _token.safeTransfer(owner(), left);
        emit Withdraw(owner(), to, left, payment);
    }

    function _payAmount() internal view returns (uint256) {
        uint256 priceNow = _factory.convertFiat2Token(_priceFiat);
        uint256 maxPrice = _maxPriceToken;
        return priceNow < maxPrice ? priceNow : maxPrice;
    }

    function _payReceiver() internal view returns (address) {
        return _factory.payReceiver();
    }

    function _claimable() internal view returns (uint256) {
        uint256 timeDif = block.timestamp - _depositTime;
        return timeDif * _apr * _contractBalance() / 365 days / 10_000;
    }

    function _contractBalance() internal view returns (uint256) {
        return _token.balanceOf(address(this));
    }
}
