// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "contracts/interfaces/ITutellusStaking.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "./TutellusStake2LearnFactory.sol";
import "./Stake2X.sol";

contract TutellusStake2Learn is Stake2X, UUPSUpgradeableByRole {
    function initialize(
        address account_,
        address token_,
        address stakingContract_,
        uint256 priceFiat_,
        uint256 maxPriceToken_
    ) public initializer {
        __Stake2X_initialize(account_, token_, stakingContract_, priceFiat_, maxPriceToken_);
    }

    //overrides required by Stake2X
    function _depositCall(uint256 amount) internal virtual override (Stake2X) {
        ITutellusStaking(stakingContract()).depositFrom(address(this), amount);
    }

    function _claimCall() internal virtual override (Stake2X) {
        ITutellusStaking(stakingContract()).claim();
    }

    function _withdrawCall(uint256 amount) internal virtual override (Stake2X) {
        ITutellusStaking(stakingContract()).withdraw(amount);
    }

    function _canDeposit() internal virtual override (Stake2X) returns (bool) {
        return true;
    }

    function _canWithdraw() internal virtual override (Stake2X) returns (bool) {
        uint256 balance = IERC20Upgradeable(token()).balanceOf(address(this));
        uint256 deposit = ITutellusStaking(stakingContract()).getUserBalance(address(this));
        uint256 claimable = ITutellusStaking(stakingContract()).pendingRewards(address(this));
        return (balance + deposit + claimable) >= _payAmount();
    }

    function _payAmount() internal virtual override (Stake2X) returns (uint256) {
        uint256 priceNow = TutellusStake2LearnFactory(factory()).convertFiat2Token(priceFiat());
        uint256 maxPrice = maxPriceToken();
        return priceNow < maxPrice ? priceNow : maxPrice;
    }
}
