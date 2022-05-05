// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusERC20.sol";
import 'contracts/interfaces/ITutellusManager.sol';

contract TutellusClientsVaultV2 is UUPSUpgradeableByRole {
  
  bytes32 private immutable CLIENTS_REWARDS_ADMIN_ROLE = keccak256("CLIENTS_REWARDS_ADMIN_ROLE");
  bytes32 public merkleRoot;
  string public uri;

  mapping(address => uint256) public alreadyClaimed;

  event Claim(uint256 index, address account, uint256 amount);
  event UpdateMerkleRoot(bytes32 merkleRoot, string uri);

  function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(CLIENTS_REWARDS_ADMIN_ROLE){
    merkleRoot = merkleRoot_;
    uri = uri_;
    emit UpdateMerkleRoot(merkleRoot, uri);
  }

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

  function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused {
      uint256 claimed = leftToClaim(index, account, amount, merkleProof);
      require(claimed > 0,"TutellusClientsVault: Nothing to claim.");
      alreadyClaimed[account] += claimed;
      address token = ITutellusManager(config).get("ERC20");
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      tokenInterface.transfer(account, claimed);
      emit Claim(index, account, claimed);
  }

  function initialize() public initializer {
      __AccessControlProxyPausable_init(msg.sender);
  }
}
