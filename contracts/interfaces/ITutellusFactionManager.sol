// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusFactionManager {

  event FactionIn(bytes32 id, address account);
  event FactionOut(bytes32 id, address account);

  event Stake(bytes32 id, address account, uint256 amount);
  event Unstake(bytes32 id, address account, uint256 amount);

  event StakeLP(bytes32 id, address account, uint256 amount);
  event UnstakeLP(bytes32 id, address account, uint256 amount);

  event Migrate(bytes32 id, bytes32 to, address account);

  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function FACTIONS_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function UPGRADER_ROLE (  ) external view returns ( bytes32 );
  function authorize ( address account ) external;
  function authorized ( address ) external view returns ( address );
  function config (  ) external view returns ( address );
  function faction ( bytes32 ) external view returns ( address stakingContract, address farmingContract );
  function factionOf ( address ) external view returns ( bytes32 );
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function implementation (  ) external view returns ( address );
  function migrateFaction ( address account, bytes32 to ) external;
  function pause (  ) external;
  function paused (  ) external view returns ( bool );
  function stake ( bytes32 id, address account, uint256 amount ) external;
  function stakeLP ( bytes32 id, address account, uint256 amount ) external;
  function unpause (  ) external;
  function unstake ( address account, uint256 amount ) external;
  function unstakeLP ( address account, uint256 amount ) external;
  function updateFaction ( bytes32 id, address stakingContract, address farmingContract ) external;
  function updateManager ( address manager ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes calldata data ) external;
}
