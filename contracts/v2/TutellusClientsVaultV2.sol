// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusERC20.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusClientsVaultV2.sol";

/// @title The contract of TutellusClientsVaultV2
/// @notice Manages clients rewards with a efficient distribution using merkle trees verification
contract TutellusClientsVaultV2 is ITutellusClientsVaultV2, UUPSUpgradeableByRole {
  
  /** STORAGE */

  bytes32 private immutable CLIENTS_REWARDS_ADMIN_ROLE = keccak256("CLIENTS_REWARDS_ADMIN_ROLE");

  /// @inheritdoc ITutellusClientsVaultV2
  bytes32 public merkleRoot;

  /// @inheritdoc ITutellusClientsVaultV2
  string public uri;

  /// @inheritdoc ITutellusClientsVaultV2
  mapping(address => uint256) public alreadyClaimed;

  /** METHODS */

  /// @inheritdoc ITutellusClientsVaultV2
  function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused {
      uint256 claimed = leftToClaim(index, account, amount, merkleProof);
      require(claimed > 0,"TutellusClientsVault: Nothing to claim.");
      alreadyClaimed[account] += claimed;
      address token = ITutellusManager(config).get(keccak256("ERC20"));
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      tokenInterface.transfer(account, claimed);
      emit Claim(index, account, claimed);
  }

  /// @inheritdoc ITutellusClientsVaultV2
  function initialize() public initializer {
      __AccessControlProxyPausable_init(msg.sender);
  }

  /// @inheritdoc ITutellusClientsVaultV2
  function leftToClaim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) public view returns(uint256) {
      bytes32 node = keccak256(abi.encodePacked(index, account, amount));
      require(MerkleProofUpgradeable.verify(merkleProof, merkleRoot, node), "TutellusClientsVault: Invalid proof.");
      uint256 alreadyClaimed_ = alreadyClaimed[account];
      if(amount > alreadyClaimed_){
        return amount - alreadyClaimed_;
      }else{
        return 0;
      }
  }

  /// @inheritdoc ITutellusClientsVaultV2
  function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(CLIENTS_REWARDS_ADMIN_ROLE){
    merkleRoot = merkleRoot_;
    uri = uri_;
    emit UpdateMerkleRoot(merkleRoot, uri);
  }

}
