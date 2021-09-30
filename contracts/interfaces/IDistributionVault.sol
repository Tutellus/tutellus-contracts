// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IDistributionVault {
    function token() external view returns(address);
    function distributeTokens(address addr_, uint256 amount_) external;
    function claim() external;
    function allocated(address addr_) external view returns(uint256);
    function released(address addr_) external view returns(uint256);
    function distributed(address addr_) external view returns(uint256);
    function releasePerBlock(address addr_) external view returns(uint256);
    function startBlock(address addr_) external view returns(uint);
    function endBlock(address addr_) external view returns(uint);
    function lastUpdate(address addr_) external view returns(uint);
    function available(address addr_) external view returns(uint256);
    function isStakeholder(address addr_) external view returns (bool);
}
