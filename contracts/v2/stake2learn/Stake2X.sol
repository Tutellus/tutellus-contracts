// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

abstract contract Stake2X is OwnableUpgradeable {
    address private _factory;
    address private _token;
    address private _stakingContract;
    uint256 private _priceFiat;
    uint256 private _maxPriceToken;

    function __Stake2X_initialize(
        address account_,
        address token_,
        address stakingContract_,
        uint256 priceFiat_,
        uint256 maxPriceToken_
    ) internal onlyInitializing {
        __Ownable_init();
        _transferOwnership(account_);

        _token = token_;
        _stakingContract = stakingContract_;
        _factory = msg.sender;
        _priceFiat = priceFiat_;
        _maxPriceToken = maxPriceToken_;
    }

    function _depositCall(uint256 amount) internal virtual {}
    function _claimCall() internal virtual {}
    function _withdrawCall() internal virtual {}
    function _canDeposit(uint256 amount) internal virtual returns (bool) {}
    function _canWithdraw() internal virtual returns (bool) {}
    function _payAmount() internal view virtual returns (uint256) {}
    function _payReceiver() internal virtual returns (address) {}

    //TBD: function to migrate to another staking contract

    function token() public view returns (address) {
        return _token;
    }

    function stakingContract() public view returns (address) {
        return _stakingContract;
    }

    function factory() public view returns (address) {
        return _factory;
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

    //we assume funds are transfered by factory before deposit call
    function deposit(uint256 amount) public {
        require(_canDeposit(amount), "");
        _deposit(amount);
    }

    function claimAndDeposit() public {
        _claim();
        uint256 amount = IERC20Upgradeable(_token).balanceOf(address(this));
        _deposit(amount);
    }

    function withdraw() public {
        require(_canWithdraw(), "");
        _withdraw();
    }

    function _deposit(uint256 amount) internal {
        IERC20Upgradeable(_token).approve(_stakingContract, amount);
        _depositCall(amount);
    }

    function _claim() internal {
        _claimCall();
    }

    function _withdraw() internal {
        _claim();
        _withdrawCall();
        IERC20Upgradeable tokenContract = IERC20Upgradeable(_token);
        uint256 payment = _payAmount();
        address to = _payReceiver();
        tokenContract.transfer(to, payment);
        uint256 left = tokenContract.balanceOf(address(this));
        tokenContract.transfer(owner(), left);
    }
}
