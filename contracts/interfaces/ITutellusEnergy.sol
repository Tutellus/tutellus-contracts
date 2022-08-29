// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusEnergy {

  /// @notice Emitted when event tokens are minted
  /// @param eventId Identificator of event
  /// @param account Address receiving tokens
  /// @param amount Minted amount
  event EventMint(bytes32 eventId, address account, uint256 amount);

  /// @notice Emitted when event tokens are burnt
  /// @param eventId Identificator of event
  /// @param account Address whose tokens are burnt
  /// @param amount Burnt amount
  event EventBurn(bytes32 eventId, address account, uint256 amount);

  /// @notice Returns unscaled balanceOf for some event
  /// @dev Unscaled balanceOf + staticBalanceOf
  /// @param account Address to return balance
  /// @return balance Balance
  function balanceOf ( address account ) external view returns ( uint256 );
  
  /// @notice Destroys amount tokens of account reducing total supply
  /// @dev Burns first static balance and then variable if needed
  /// @param account Address to burn tokens from
  /// @param amount Amount of tokens to burn
  function burn ( address account, uint256 amount ) external;

  /// @notice Destroys balanceOf tokens of account reducing total supply
  /// @dev Burns all static and variable
  /// @param account Address to burn all its tokens from
  function burnAll ( address account ) external;

  /// @notice Destroys amount tokens related to an event of account reducing total supply
  /// @param eventId Identificator of an event
  /// @param account Address to burn tokens from
  /// @param amount Amount of tokens to burn
  function burnEvent ( bytes32 eventId, address account, uint256 amount ) external;

  /// @notice Destroys amount static tokens of account reducing total supply
  /// @param account Address to burn tokens from
  /// @param amount Amount of static tokens to burn
  function burnStatic ( address account, uint256 amount ) external;

  /// @notice Destroys amount variable tokens of account reducing total supply
  /// @param account Address to burn tokens from
  /// @param amount Amount of variable tokens to burn
  function burnVariable ( address account, uint256 amount ) external;

  /// @notice Returns unscaled balanceOf for some event
  /// @dev Unscaled balanceOf + event static balance
  /// @param eventId Identificator for event
  /// @param account Address to return balance
  /// @return balance Balance
  function eventBalanceOf ( bytes32 eventId, address account ) external view returns ( uint256 );

  /// @notice Returns unscaled balanceOf for some event in a snapshot
  /// @dev Unscaled balanceOfAt + event static balance
  /// @param eventId Identificator for event
  /// @param account Address to return balance
  /// @param snapshotId Identificator for snapshot
  /// @return balance Balance
  function eventBalanceOfAt ( bytes32 eventId, address account, uint256 snapshotId ) external view returns ( uint256 );
  
  /// @notice Returns total supply of tokens for some event
  /// @param eventId Identificator for event
  /// @return eventSupply Balance
  function eventTotalSupply ( bytes32 eventId ) external view returns ( uint256 );
  
  /// @notice Returns total supply of tokens for some event in a snapshot
  /// @param eventId Identificator for event
  /// @param snapshotId Identificator for snapshot
  /// @return eventSupply Balance
  function eventTotalSupplyAt ( bytes32 eventId, uint256 snapshotId ) external view returns ( uint256 );
  
  /// @notice Returns identificator of current snapshot
  /// @return id Current snapshot identificator
  function getCurrentSnapshotId (  ) external view returns ( uint256 );
  
  /// @notice Initialize proxy
  function initialize (  ) external;

  /// @notice Creates amount tokens and assigns them to account increasing total supply
  /// @dev Mints static tokens, using mint to keep standard
  /// @param account Address of the receiver of tokens
  /// @param amount Amount of static tokens to mint
  function mint ( address account, uint256 amount ) external;

  /// @notice Creates amount event tokens and assigns them to account increasing total supply
  /// @param eventId Identificator for event
  /// @param account Address of the receiver of tokens
  /// @param amount Amount of tokens to mint
  function mintEvent ( bytes32 eventId, address account, uint256 amount ) external;

  /// @notice Creates amount tokens and assigns them to account increasing total supply
  /// @dev Mints static tokens
  /// @param account Address of the receiver of tokens
  /// @param amount Amount of static tokens to mint
  function mintStatic ( address account, uint256 amount ) external;

  /// @notice Creates amount tokens and assigns them to account increasing total supply
  /// @dev Mints variable tokens
  /// @param account Address of the receiver of tokens
  /// @param amount Amount of variable tokens to mint
  function mintVariable ( address account, uint256 amount ) external;

  /// @notice Returns the scaled equivalent of amount
  /// @param amount Unscaled amount to transform
  /// @return scaledAmount Scaled amount
  function scale ( uint256 amount ) external view returns ( uint256 );

  /// @notice Updates params to unscale
  /// @dev Sets rate and lastUpdateTimestamp
  /// @param newRate The new interest rate, in ray
  function setRate ( uint256 newRate ) external;

  /// @notice Creates a new snapshot
  function snapshot (  ) external returns ( uint256 );

  /// @notice Returns the unscaled equivalent of amount
  /// @param amount scaled amount to transform
  /// @return scaledAmount Unscaled amount
  function unscale ( uint256 amount ) external view returns ( uint256 );
}
