// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusEnergyMultiplierManager {
    /// @notice Emitted when multiplier type of a contract is updated
    /// @param energyContract Address of the contract to update
    /// @param multiplierType New multiplier type for contract
    event SetMultiplierType(address energyContract, uint8 multiplierType);

    /// @notice Emitted when factor of a multiplier type is updated
    /// @param factor New factor for multiplierType
    /// @param multiplierType Multiplier type to update factor
    event SetFactor(uint256 factor, uint8 multiplierType);

    /// @notice Returns identificator for contract admin role
    function ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE()
        external
        view
        returns (bytes32);

    /// @notice Returns energy multiplier for a contract
    /// @dev Checks if staking, farming or none
    /// @param _contract Address of the contract
    /// @return energyMultiplier
    function getEnergyMultiplier(address _contract)
        external
        view
        returns (uint256);

    /// @notice Initialize proxy
    function initialize() external;

    /// @notice Update factor of a type of contracts
    /// @param factor New factor for _type
    /// @param _type Type of contract to update factor
    function setFactoryByType(uint256 factor, uint8 _type) external;

    /// @notice Assign a type for a contract
    /// @param _contract Address of the contract to update type
    /// @param _type New type for contract
    function setMultiplierType(address _contract, uint8 _type) external;
}
