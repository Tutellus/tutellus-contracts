// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "./utils/AccessControlProxyPausable.sol";
import "./interfaces/ITutellusERC20.sol";

contract TutellusMerkleDistributorUpdateable is AccessControlProxyPausable {

    address public token;
    bytes32 public merkleRoot;
    string public uri;

    mapping(address => uint256) private _alreadyClaimed;

    event Claimed(uint256 index, address account, uint256 claimed);
    event MerkleRootUpdated(bytes32 merkleRoot, string uri);

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(DEFAULT_ADMIN_ROLE){
      merkleRoot = merkleRoot_;
      uri = uri_;
      emit MerkleRootUpdated(merkleRoot, uri);
    }

    function alreadyClaimed(address account) public view returns(uint256){
      return _alreadyClaimed[account];
    }

    function leftToClaim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) public view returns(uint256) {
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProofUpgradeable.verify(merkleProof, merkleRoot, node), "MerkleDistributorUpdateable: Invalid proof.");
        uint256 alreadyClaimed_ = alreadyClaimed(account);
        if(amount > alreadyClaimed_){
          return amount - alreadyClaimed_;
        }else{
          return 0;
        }
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused {
        uint256 claimed = leftToClaim(index, account, amount, merkleProof);
        require(claimed > 0,"MerkleDistributorUpdateable: Nothing to claim.");
        _alreadyClaimed[account] += claimed;
        ITutellusERC20 tokenInterface = ITutellusERC20(token);
        tokenInterface.transfer(account, amount);
        emit Claimed(index, account, claimed);
    }

    constructor(address rolemanager, address token_) {
      __MerkleDistributorUpdateable_init(rolemanager, token_);
    }

    function __MerkleDistributorUpdateable_init(address rolemanager, address token_) internal initializer {
      __AccessControlProxyPausable_init(rolemanager);
      __MerkleDistributorUpdateable_init_unchained(token_);
    }

    function __MerkleDistributorUpdateable_init_unchained(address token_) internal initializer {
      token = token_;
    }
}
