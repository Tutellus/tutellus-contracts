// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusFactionManager {

  /// @notice Emitted when a new account enters a faction
  /// @param id Identificator of faction
  /// @param account Address of the new user in faction
  event FactionIn(bytes32 id, address account);

  /// @notice Emitted when a new account goes leaves a faction
  /// @param id Identificator of faction
  /// @param account Address of the user leaving faction
  event FactionOut(bytes32 id, address account);

  /// @notice Emitted when an account deposits in staking contract of faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to deposit
  /// @param energy Amount of energy minted for depositing
  event Stake(bytes32 id, address account, uint256 amount, uint256 energy);

  /// @notice Emitted when an account withdraws from staking contract of faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to withdraw
  /// @param energy Amount of energy burnt for withdrawing
  event Unstake(bytes32 id, address account, uint256 amount, uint256 energy);

  /// @notice Emitted when an account deposits in farming contract of faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to deposit
  /// @param energy Amount of energy minted for depositing
  event StakeLP(bytes32 id, address account, uint256 amount, uint256 energy);

  /// @notice Emitted when an account withdraws from farming contract of faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to withdraw
  /// @param energy Amount of energy burnt for withdrawing
  event UnstakeLP(bytes32 id, address account, uint256 amount, uint256 energy);

  /// @notice Emitted when a user migrates from one faction to another
  /// @param id Old faction identificator
  /// @param to New faction identificator
  /// @param account Address of the user
  event Migrate(bytes32 id, bytes32 to, address account);

  /// @notice Authorize an account to interact with Launchpad
  /// @param account Address of the user
  function authorize ( address account ) external;

  /// @notice Returns if an account is authorized to interact with Launchpad or not
  /// @param account Address of the user
  /// @return isAuthorized Whether or not is authorized
  function authorized ( address account ) external view returns ( address );

  /// @notice Executes transferFrom of account, amount and token
  /// @dev Only callable by faction staking contracts
  /// @param account Account to transfer from
  /// @param amount Amount to transfer
  /// @param token Token to transfer from
  function depositFrom ( address account, uint256 amount, address token ) external;

  /// @notice Returns addresses for staking and farming contracts of faction
  /// @param id Identificator of faction
  /// @return stakingContract Address of staking contract
  /// @return farmingContract Address of farming contract
  function faction ( bytes32 id ) external view returns ( address stakingContract, address farmingContract );
  
  /// @notice Returns identificator of faction of an user
  /// @param account Address of the user
  /// @return id Identificator of faction
  function factionOf ( address account ) external view returns ( bytes32 );

  /// @notice Returns loss of energy for migrating faction
  /// @dev Losses variable energy gains
  /// @param account Address of the user
  /// @return loss Amount of energy loss for migrating
  function getMigrateLoss (address account) external view returns(uint);

  /// @notice Initialize proxy
  function initialize (  ) external;

  /// @notice Migrate to a different faction
  /// @dev Moves deposited amounts
  /// @param account Address of the user
  /// @param to Identificator of faction to move to
  function migrateFaction ( address account, bytes32 to ) external;
  
  /// @notice Deposit in staking contract of a faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to deposit
  function stake ( bytes32 id, address account, uint256 amount ) external;

  /// @notice Deposit in farming contract of a faction
  /// @param id Identificator of faction
  /// @param account Address of the user
  /// @param amount Amount to deposit
  function stakeLP ( bytes32 id, address account, uint256 amount ) external;

  /// @notice Withdraw from staking contract of a faction
  /// @param account Address of the user
  /// @param amount Amount to withdraw
  function unstake ( address account, uint256 amount ) external;

  /// @notice Withdraw from farming contract of a faction
  /// @param account Address of the user
  /// @param amount Amount to withdraw
  function unstakeLP ( address account, uint256 amount ) external;

  /// @notice Update staking and farming contracts of a faction
  /// @param id Identificator of faction
  /// @param stakingContract Address of staking contract
  /// @param farmingContract Address of farming contract
  function updateFaction ( bytes32 id, address stakingContract, address farmingContract ) external;
}
