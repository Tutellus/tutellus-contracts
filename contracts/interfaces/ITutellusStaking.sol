// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusStaking {
    function depositFrom(address account, uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);
    function claim() external;
    function getFee(address user_) external view returns(uint256);
    function pendingRewards(address user_) external view returns(uint256);
    function getUserBalance(address user_) external view returns(uint256);
}
