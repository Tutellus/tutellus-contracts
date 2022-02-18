// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../interfaces/IERC20.sol";

contract CoinCharger {

    event Sync(address indexed token, address indexed receiver, uint amount);

    function _transfer(address token_, address to_, uint amount_) internal {
        if (token_ == address(0)) {
            if (to_ != address(this)) _safeTransferETH(to_, amount_);
        } else {
            _transferERC20(token_, to_, amount_);
        }
    }

    function _transferFrom(address token_, address from_, address to_, uint amount_) internal {
        if (token_ == address(0)) {
            _chargeAndtransferETH(to_, amount_);
        } else {
            _transferFromERC20(token_, from_, to_, amount_);
        }
    }

    function _chargeAndtransferETH(address to_, uint amount_) internal {
        require(msg.value >= amount_, "CoinCharger: wrong msg.value");
        if (to_ != address(this)) _safeTransferETH(to_, amount_);
    }

    // TBD: recheck...this is from https://github.com/Rari-Capital/solmate/blob/main/src/utils/SafeTransferLib.sol
    function _safeTransferETH(address to_, uint256 amount_) internal {
        bool callStatus;

        assembly {
            // Transfer the ETH and store if it succeeded or not.
            callStatus := call(gas(), to_, amount_, 0, 0, 0, 0)
        }

        require(callStatus, "CoinCharger: ETH_TRANSFER_FAILED");
    }

    function _transferFromERC20(address token_, address sender_, address recipient_, uint amount_) internal {
        IERC20(token_).transferFrom(sender_, recipient_, amount_);
    }

    function _transferERC20(address token_, address recipient_, uint amount_) internal {
        IERC20(token_).transfer(recipient_, amount_);
    }

    function _sync(address token_, address receiver, uint balance_) internal {
        uint amount_;
        if (token_ == address(0)) {
            amount_ = address(this).balance - balance_;
        } else {
            amount_ = IERC20(token_).balanceOf(address(this)) - balance_;
        }

        _transfer(token_, receiver, amount_);

        emit Sync(token_, receiver, amount_);
    }
}
