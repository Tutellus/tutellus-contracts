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

    event Deposit(address indexed owner, uint256 amount);
    event Claim(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, address receiver, uint256 left, uint256 payment);

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

    function _depositCall(uint256 amount) internal virtual;
    function _claimCall() internal virtual;
    function _withdrawCall() internal virtual;
    function _canDeposit(uint256 amount) internal view virtual returns (bool);
    function _canWithdraw() internal view virtual returns (bool);
    function _payAmount() internal view virtual returns (uint256);
    function _deposited() internal view virtual returns (uint256);
    function _claimable() internal view virtual returns (uint256);
    function _fee() internal view virtual returns (uint256);
    function _payReceiver() internal virtual returns (address);

    //TBD: function to migrate to another staking contract
    //TBD: transferFromAndDeposit?

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

    function canWithdraw() public view returns (bool) {
        return _canWithdraw();
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

    function withdraw() public onlyOwner {
        require(_canWithdraw(), "");
        _withdraw();
    }

    function _deposit(uint256 amount) internal {
        IERC20Upgradeable(_token).approve(_stakingContract, amount);
        _depositCall(amount);
        emit Deposit(owner(), amount);
    }

    function _claim() internal {
        uint256 claimable = _claimable();
        _claimCall();
        emit Claim(owner(), claimable);
    }

    function _withdraw() internal {
        _claim();
        _withdrawCall();
        IERC20Upgradeable tokenContract = IERC20Upgradeable(_token);
        uint256 payment = _payAmount();
        address to = _payReceiver();
        tokenContract.transfer(to, payment);
        uint256 left = _contractBalance();
        tokenContract.transfer(owner(), left);
        emit Withdraw(owner(), to, left, payment);
    }

    function _contractBalance() internal view returns (uint256) {
        return IERC20Upgradeable(token()).balanceOf(address(this));
    }
}
