// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusStaking.sol";
import "contracts/interfaces/ITutellusStakeToLearnFactory.sol";

contract TutellusStakeToLearn is UUPSUpgradeableByRole, EIP712Upgradeable {
    bytes32 private immutable TUTELLUS_STAKETOLEARN_ADMIN_ROLE = keccak256("TUTELLUS_STAKETOLEARN_ADMIN_ROLE");

    address private _owner;
    ITutellusStakeToLearnFactory private _factory;
    uint private _price;
    uint private _anualInterestPercentage;
    uint private _startDate;

    modifier onlyOwner() {
        require(msg.sender == _owner, "");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address accessControlManager,
        address account,
        uint price,
        uint anualInterestPercentage,
        uint depositAmount
    ) public initializer {
        __AccessControlProxyPausable_init(accessControlManager);

        _owner = account;
        _factory = ITutellusStakeToLearnFactory(msg.sender);
        _price = price;
        _anualInterestPercentage = anualInterestPercentage;

        address tutAddress = _factory.tutAddress();
        address btcAddress = _factory.btcAddress();
        address poolAddress = _factory.poolAddress();
        address stakingAddress = _factory.stakingAddress();

        address token0 = IUniswapV2Pair(poolAddress).token0();
        address token1 = IUniswapV2Pair(poolAddress).token1();
        require(tutAddress == token0 || tutAddress == token1, "");
        require(btcAddress == token0 || btcAddress == token1, "");
 
        IERC20(tutAddress).approve(stakingAddress, type(uint256).max);
        _deposit(depositAmount);
    }

    function owner() public view returns(address) {
        return _owner;
    }

    function checkClose() public view returns(bool) {
        uint rewards = _getPendingRewards();
        uint staked = _getStaked();
        return _checkClose(rewards + staked);
    }

    function claimAndDeposit() public onlyOwner {
        uint claimAmount = _claim();
        _deposit(claimAmount);
    }

    function close() public onlyOwner {
        require(_checkClose(_getPendingRewards()), "");
        _claim();
        _close();
    }

    function closeForceAdmin() public onlyRole(TUTELLUS_STAKETOLEARN_ADMIN_ROLE) {
        _closeForce(true);
    }

    function closeForce() public onlyOwner {
        _closeForce(false);
    }

    function _closeForce(bool skipCheck) internal {
        uint amountAvailable = _getPendingRewards() + _getStaked();
        require(_checkClose(amountAvailable) || skipCheck, "");
        _claim();
        _close();
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

    function _close() internal {
        _withdraw();
        address tutAddress = _factory.tutAddress();
        IERC20 tut = IERC20(tutAddress);
        uint closeAmount = _getAmountToClose();
        uint balance = tut.balanceOf(address(this));
        uint treasuryAmount = closeAmount < balance ? closeAmount : balance;
        address treasury = ITutellusManager(config).get(keccak256("STAKETOLEARN_VAULT"));
        require(tut.transfer(treasury, treasuryAmount), "");
        uint amountLeft = closeAmount < balance ? balance - closeAmount : 0;
        if (amountLeft > 0) require(tut.transfer(_owner, amountLeft), "");
    }

    function _claim() internal returns(uint) {
        uint claimAmount = _getPendingRewards();
        address stakingAddress = _factory.stakingAddress();
        ITutellusStaking(stakingAddress).claim();
        return claimAmount;
    }

    function _deposit(uint depositAmount) internal {
        address stakingAddress = _factory.stakingAddress();
        ITutellusStaking(stakingAddress).depositFrom(address(this), depositAmount);
    }

    function _withdraw() internal returns(uint) {
        address stakingAddress = _factory.stakingAddress();
        uint withdrawAmount = _getStaked();
        ITutellusStaking(stakingAddress).withdraw(withdrawAmount);
        return withdrawAmount;
    }

    function _getStaked() internal view returns (uint) {
        address stakingAddress = _factory.stakingAddress();
        return ITutellusStaking(stakingAddress).getUserBalance(address(this));
    }

    function _getPendingRewards() internal view returns (uint) {
        address stakingAddress = _factory.stakingAddress();
        return ITutellusStaking(stakingAddress).pendingRewards(address(this));
    }

    function _transformTutToUsd(uint amountTut) internal view returns(uint) {
        return amountTut * _getTutToUsdPrice() / 1 ether;
    }

    function _getTutToUsdPrice() internal view returns(uint) {
        (uint reserveTut, uint reserveBtc) = _getPoolReserves();
        uint reserveUsd = _transformBtcToUsd(reserveBtc);
        return reserveUsd * 1 ether / reserveTut;
    }

    function _getPoolReserves() internal view returns(uint reserveTut, uint reserveBtc) {
        address poolAddress = _factory.poolAddress();
        IUniswapV2Pair _pool = IUniswapV2Pair(poolAddress);
        (reserveTut, reserveBtc,) = _pool.getReserves();
    }

    function _transformBtcToUsd(uint amountBtc) internal view returns(uint) {
        address feedBtcUsd = _factory.feedBtcUsd();
        address btcAddress = _factory.btcAddress();
        IERC20Metadata btcToken = IERC20Metadata(btcAddress);
        AggregatorV3Interface aggregatorInterface = AggregatorV3Interface(feedBtcUsd);
        uint256 decimals = aggregatorInterface.decimals(); //8
        (, int256 answer, , , ) = aggregatorInterface.latestRoundData();
        uint256 amountUsd = (amountBtc * uint256(answer)) / (10**decimals);
        return (amountUsd * 1 ether) / (10**btcToken.decimals()); //return in wei, 18 decimals
    }
}