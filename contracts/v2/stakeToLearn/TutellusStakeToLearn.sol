// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusStaking.sol";

contract TutellusStakeToLearn is UUPSUpgradeableByRole, EIP712Upgradeable {
    address private _owner;
    address private _stakingAddress;
    address private _feedBtcUsd;
    address private _tutAddress;
    address private _btcAddress;
    address private _poolAddress;
    uint private _price;
    uint private _anualInterestPercentage;
    uint private _btcDecimals;
    uint private _startDate;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address account,
        address stakingAddress,
        address feedBtcUsd,
        address tutAddress,
        address btcAddress,
        address poolAddress,
        uint price,
        uint anualInterestPercentage,
        uint depositAmount
    ) public initializer {
        __AccessControlProxyPausable_init(msg.sender);

        _owner = account;
        _stakingAddress = stakingAddress;
        _feedBtcUsd = feedBtcUsd;
        _btcAddress = btcAddress;
        _poolAddress = poolAddress;
        _price = price;
        _anualInterestPercentage = anualInterestPercentage;
        IERC20Metadata btcToken = IERC20Metadata(_btcAddress);
        _btcDecimals = btcToken.decimals();

        IERC20(tutAddress).approve(stakingAddress, depositAmount);
        _deposit(depositAmount);
    }

    function owner() public view returns(address) {
        return _owner;
    }

    function checkClose() public view returns(bool, bool) {
        uint rewards = _getPendingRewards();
        uint staked = _getStaked();
        return (_checkClose(rewards), _checkClose(rewards + staked));
    }

    function claimAndDeposit() public {
        uint claimAmount = _claim();
        _deposit(claimAmount);
    }

    function claimAndClose() public {
        require(_checkClose(_getPendingRewards()), "");
        uint claimAmount = _claim();
    }

    function claimAndCloseForce() public {
        uint amountAvailable = _getPendingRewards() + _getStaked();
        require(_checkClose(amountAvailable), "");
        uint claimAmount = _claim();
    }

    function _checkClose(uint amountAvailable) internal view returns(bool) {
        uint closeAmount = _getAmountToClose();
        return amountAvailable >= closeAmount;
    }

    function _getAmountToClose() internal view returns(uint) {
        return _getInterest() + _price;
    }

    function _getInterest() internal view returns(uint) {
        uint loanTime = block.timestamp - _startDate;
        uint interestPercentage = loanTime * _anualInterestPercentage / 365 days;
        return _price * interestPercentage / 10000; //TBD: decide if use 1e18 decimals or only 2
    }

    function _claim() internal returns(uint) {
        uint claimAmount = _getPendingRewards();
        ITutellusStaking(_stakingAddress).claim();
        return claimAmount;
    }

    function _deposit(uint depositAmount) internal {
        ITutellusStaking(_stakingAddress).depositFrom(address(this), depositAmount);
    }

    function _withdraw() internal returns(uint) {
        uint withdrawAmount = _getStaked();
        ITutellusStaking(_stakingAddress).withdraw(withdrawAmount);
        return withdrawAmount;
    }

    function _getStaked() internal view returns (uint) {
        return ITutellusStaking(_stakingAddress).getUserBalance(address(this));
    }

    function _getPendingRewards() internal view returns (uint) {
        return ITutellusStaking(_stakingAddress).pendingRewards(address(this));
    }

    function _transformTutToUsd(uint amountTut) internal returns(uint) {
        return amountTut * _getTutToUsdPrice() / 1 ether;
    }

    function _getTutToUsdPrice() internal returns(uint) {
        (uint reserveTut, uint reserveBtc) = _getPoolReserves();
        uint reserveUsd = _transformBtcToUsd(reserveBtc);
        return reserveUsd * 1 ether / reserveTut;
    }

    function _getPoolReserves() internal returns(uint reserveTut, uint reserveBtc) {
        IUniswapV2Pair _pool = IUniswapV2Pair(_poolAddress);
        (reserveTut, reserveBtc,) = _pool.getReserves();
    }

    function _transformBtcToUsd(uint amountBtc) internal returns(uint) {
        IERC20Metadata btcToken = IERC20Metadata(_btcAddress);
        AggregatorV3Interface aggregatorInterface = AggregatorV3Interface(_feedBtcUsd);
        uint256 decimals = aggregatorInterface.decimals(); //8, TBD: get in initialize or hardcode
        (, int256 answer, , , ) = aggregatorInterface.latestRoundData();
        uint256 amountUsd = (amountBtc * uint256(answer)) / (10**decimals);
        return (amountUsd * 1 ether) / (10**btcToken.decimals()); //return in wei, 18 decimals
    }

    
}