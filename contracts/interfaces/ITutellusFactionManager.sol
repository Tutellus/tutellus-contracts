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

  function authorize ( address account ) external;
  function authorized ( address ) external view returns ( address );
  function depositFrom ( address account, uint256 amount ) external;
  function faction ( bytes32 ) external view returns ( address stakingContract, address farmingContract );
  function factionOf ( address ) external view returns ( bytes32 );
  function migrateFaction ( address account, bytes32 to ) external;
  function stake ( bytes32 id, address account, uint256 amount ) external;
  function stakeLP ( bytes32 id, address account, uint256 amount ) external;
  function unstake ( address account, uint256 amount ) external;
  function unstakeLP ( address account, uint256 amount ) external;
  function updateFaction ( bytes32 id, address stakingContract, address farmingContract ) external;

}
