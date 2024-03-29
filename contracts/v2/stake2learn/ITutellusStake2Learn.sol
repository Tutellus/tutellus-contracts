// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusStake2Learn {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    function UPGRADER_ROLE() external view returns (bytes32);
    function claimAndDeposit() external;
    function config() external view returns (address);
    function deposit(uint256 amount) external;
    function factory() external view returns (address);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function implementation() external view returns (address);
    function initialize(address account_, address token_, uint256 priceFiat_, uint256 maxPriceToken_, uint256 apr_)
        external;
    function maxPriceToken() external view returns (uint256);
    function owner() external view returns (address);
    function pause() external;
    function paused() external view returns (bool);
    function priceFiat() external view returns (uint256);
    function proxiableUUID() external view returns (bytes32);
    function renounceOwnership() external;
    function stakingContract() external view returns (address);
    function token() external view returns (address);
    function transferOwnership(address newOwner) external;
    function unpause() external;
    function updateManager(address manager) external;
    function upgradeTo(address newImplementation) external;
    function upgradeToAndCall(address newImplementation, bytes memory data) external;
    function withdraw() external;
}
