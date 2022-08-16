// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

interface ITutellusStakeToLearnFactory {
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function UPGRADER_ROLE (  ) external view returns ( bytes32 );
  function beacon (  ) external view returns ( address );
  function btcAddress (  ) external view returns ( address );
  function config (  ) external view returns ( address );
  function createProxy ( uint256 depositAmount, uint256 price, uint256 anualInterestPercentage, uint256 deadline, bytes calldata signature, address signer ) external returns ( address proxy );
  function feedBtcUsd (  ) external view returns ( address );
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function implementation (  ) external view returns ( address );
  function initialize ( address stakingAddress, address feedBtcUsd, address tutAddress, address btcAddress, address poolAddress ) external;
  function pause (  ) external;
  function paused (  ) external view returns ( bool );
  function poolAddress (  ) external view returns ( address );
  function proxiableUUID (  ) external view returns ( bytes32 );
  function stakingAddress (  ) external view returns ( address );
  function tutAddress (  ) external view returns ( address );
  function unpause (  ) external;
  function updateManager ( address manager ) external;
  function upgrade ( bytes calldata bytecode ) external returns ( address implementation );
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes calldata data ) external;
  function upgradeWithImplementation ( address implementation ) external;
}
