// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITutellusEnergyMultiplierManager {
  function ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function getEnergyMultiplier ( address _contract ) external view returns ( uint256 );
  function setMultiplierType ( address _contract, uint8 _type ) external;
}
