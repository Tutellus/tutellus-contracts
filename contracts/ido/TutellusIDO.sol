// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "../utils/CoinCharger.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../interfaces/ITutellusManager.sol";

contract TutellusIDO is UUPSUpgradeableByRole, CoinCharger {

    uint public prefunded;
    uint public fundingAmount;
    uint public minPrefund;
    address public idoToken;
    address public prefundToken;
    bytes32 public merkleRoot;
    string public uri;

    mapping(address => uint) private _claimed;
    mapping(address => uint) private _prefunds;

    event Prefund(address indexed funder, uint indexed faction, uint amount);
    event Withdraw(address indexed funder, uint amount);
    event RemovePrefunder(address indexed funder);
    event UpdateMerkleRoot(bytes32 merkleRoot, string uri);
    event Claim(uint256 index, address account, uint256 amount, uint256 allocation, uint256 withdraw, uint256 energy);

    function initialize(
        address rolemanager_,
        uint fundingAmount_,
        uint minPrefund_,
        address idoToken_,
        address prefundToken_
    ) public initializer {
        __AccessControlProxyPausable_init(rolemanager_);
        fundingAmount = fundingAmount_;
        minPrefund = minPrefund_;
        idoToken = idoToken_;
        prefundToken = prefundToken_;
    }

    function getPrefunded(address prefunder_) public view returns(uint) {
        return _prefunds[prefunder_];
    }

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = merkleRoot_;
        uri = uri_;
        emit UpdateMerkleRoot(merkleRoot, uri);
    }

    function prefund(uint prefundAmount_) public {
        // TBD: allow anyone prefund or filter?
        // TBD: allow prefund to thirds
        address prefunder_ = _msgSender();
        require(prefundAmount_ >= minPrefund, "TutellusIDO: insufficient prefund");
        _prefund(prefundAmount_, prefunder_);
    }

    function withdrawAll() public {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, _prefunds[prefunder_]);

        emit RemovePrefunder(prefunder_);
    }

    function withdraw(uint amount_) public {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_);
        require(_prefunds[prefunder_] >= minPrefund, "TutellusIDO: try withdrawAll");
    }

    function claim(uint index_, address account_, uint allocation_, uint withdraw_, uint energy_, bytes32[] calldata merkleProof_) public {
        // TBD: handle vesting
        // uint claimableAmount_ = amount_ - _claimed[account_];
        // require(claimableAmount_ > 0, "TutellusIDO: nothing to claim");
        // _claimed[account_] += claimableAmount_;
        _verifyMerkle(index_, account_, allocation_, withdraw_, energy_, merkleProof_);
        _transfer(idoToken, account_, allocation_);
        _transfer(prefundToken, account_, withdraw_);
        emit Claim(index_, account_, allocation_, allocation_, withdraw_, energy_); //TBD: use claimableAmount in 3rd param
    }

    function sync() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _sync(prefundToken, msg.sender, prefunded);
    }

    function _prefund(uint prefundAmount_, address prefunder_) internal {
        _transferFrom(prefundToken, prefunder_, address(this), prefundAmount_);
        prefunded += prefundAmount_;
        _prefunds[prefunder_] += prefundAmount_;
        emit Prefund(prefunder_, _getFaction(prefunder_), prefundAmount_);
    }

    function _withdraw(address prefunder_, uint amount_) internal {
        require(_prefunds[prefunder_] >= amount_, "TutellusIDO: cant withdraw more than prefunded");
        prefunded -= amount_;
        _prefunds[prefunder_] -= amount_;
        _transfer(prefundToken, prefunder_, amount_);

        emit Withdraw(prefunder_, amount_);
    }

    function _verifyMerkle(uint index_, address account_, uint allocation_, uint withdraw_, uint energy_, bytes32[] calldata merkleProof_) internal view {
        bytes32 node_ = keccak256(abi.encodePacked(index_, account_, allocation_, withdraw_, energy_));
        require(MerkleProofUpgradeable.verify(merkleProof_, merkleRoot, node_), "TutellusIDO: Invalid merkle proof");
    }

    function _getFaction(address funder_) internal view returns(uint) {
        return 0;
    }

    function _getEnergy(address funder_) internal view returns(uint) {
        return 0;
    }

    function _isSupertutellian(address funder_) internal view returns(bool) {
        return true;
    }
}
