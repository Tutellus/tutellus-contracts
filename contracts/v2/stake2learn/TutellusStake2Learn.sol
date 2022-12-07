// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "contracts/interfaces/ITutellusStaking.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/utils/AccessControlProxyPausable.sol";
import "./TutellusStake2LearnFactory.sol";
import "./Stake2X.sol";

contract TutellusStake2Learn is Stake2X, AccessControlProxyPausable {
    function initialize(
        address manager_,
        address account_,
        address token_,
        address stakingContract_,
        uint256 priceFiat_,
        uint256 maxPriceToken_
    ) public initializer {
        __AccessControlProxyPausable_init(manager_);
        __Stake2X_initialize(account_, token_, stakingContract_, priceFiat_, maxPriceToken_);
    }

    //overrides required by Stake2X
    function _depositCall(uint256 amount) internal virtual override (Stake2X) {
        ITutellusStaking(stakingContract()).depositFrom(address(this), amount);
    }

    function _claimCall() internal virtual override (Stake2X) {
        ITutellusStaking(stakingContract()).claim();
    }

    function _withdrawCall() internal virtual override (Stake2X) {
        uint256 amount = _deposited();
        ITutellusStaking(stakingContract()).withdraw(amount);
    }

    function _canDeposit(uint256 amount) internal view virtual override (Stake2X) returns (bool) {
        uint256 balance = _contractBalance();
        return balance >= amount;
    }

    function _canWithdraw() internal view virtual override (Stake2X) returns (bool) {
        uint256 balance = _contractBalance();
        uint256 deposit = _deposited();
        uint256 claimable = _claimable();
        uint256 fee = _fee();
        return (balance + deposit + claimable - fee) >= _payAmount();
    }

    function _payAmount() internal view virtual override (Stake2X) returns (uint256) {
        uint256 priceNow = TutellusStake2LearnFactory(factory()).convertFiat2Token(priceFiat());
        uint256 maxPrice = maxPriceToken();
        return priceNow < maxPrice ? priceNow : maxPrice;
    }

    function _payReceiver() internal virtual override (Stake2X) returns (address) {
        return ITutellusManager(config).get(keccak256("S2L_RECEIVER"));
    }

    function _deposited() internal view virtual override (Stake2X) returns (uint256) {
        return ITutellusStaking(stakingContract()).getUserBalance(address(this));
    }

    function _claimable() internal view virtual override (Stake2X) returns (uint256) {
        return ITutellusStaking(stakingContract()).pendingRewards(address(this));
    }

    function _fee() internal view virtual override (Stake2X) returns (uint256) {
        return ITutellusStaking(stakingContract()).getFee(address(this));
    }
}
