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
    uint public startDate;
    uint public endDate;
    address public idoToken;
    address public prefundToken;
    bytes32 public merkleRoot;
    string public uri;
    bool public closed;

    mapping(address => uint) private _claimed;
    mapping(address => bool) private _withdrawn;
    mapping(address => uint) private _prefunds;

    event Prefund(address indexed funder, uint amount);
    event Withdraw(address indexed funder, uint amount);
    event RemovePrefunder(address indexed funder);
    event UpdateMerkleRoot(bytes32 merkleRoot, string uri);
    event Claim(uint256 index, address account, uint256 amount, uint256 allocation, uint256 withdraw, uint256 energy);
    event Closed(bool closed);

    modifier isNotClosed() {
        require(!closed, "TutellusIDO: IDO is closed");
        _;
    }

    function initialize(
        address rolemanager_,
        uint fundingAmount_,
        uint minPrefund_,
        address idoToken_,
        address prefundToken_,
        uint startDate_,
        uint endDate_
    ) public initializer {
        __AccessControlProxyPausable_init(rolemanager_);
        fundingAmount = fundingAmount_;
        minPrefund = minPrefund_;
        idoToken = idoToken_;
        prefundToken = prefundToken_;
        startDate = startDate_;
        endDate = endDate_;
    }

    function getPrefunded(address prefunder_) public view returns(uint) {
        return _prefunds[prefunder_];
    }

    function released(
        uint256 allocation
    ) public view returns (uint256) {
        return block.timestamp > endDate ? allocation
        : block.timestamp > startDate ? allocation * (block.timestamp - startDate) / (endDate - startDate)
        : 0;
    }

    function available(address account, uint256 allocation) public view returns(uint256) {
        return released(allocation) - _claimed[account];
    }

    function open() public onlyRole(DEFAULT_ADMIN_ROLE) {
        closed = false;
        emit Closed(closed);
    }

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = merkleRoot_;
        uri = uri_;
        closed = true;
        emit UpdateMerkleRoot(merkleRoot, uri);
        emit Closed(closed);
    }

    function prefund(address prefunder_, uint prefundAmount_) public isNotClosed() {
        require(prefundAmount_ >= minPrefund, "TutellusIDO: insufficient prefund");
        _prefund(prefundAmount_, prefunder_);
    }

    function withdrawAll() public isNotClosed() {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, _prefunds[prefunder_]);

        emit RemovePrefunder(prefunder_);
    }

    function withdraw(uint amount_) public isNotClosed() {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_);
        require(_prefunds[prefunder_] >= minPrefund, "TutellusIDO: try withdrawAll");
    }

    function claim(uint index_, address account_, uint allocation_, uint withdraw_, uint energy_, bytes32[] calldata merkleProof_) public {
        _verifyMerkle(index_, account_, allocation_, withdraw_, energy_, merkleProof_);
        uint claimableAmount_ = available(account_, allocation_);
        if (claimableAmount_ > 0) {
            _claimed[account_] += claimableAmount_;
            _transfer(idoToken, account_, claimableAmount_);
        }
        if ((!_withdrawn[account_]) && (withdraw_ > 0)) {
            _withdrawn[account_] = true;
            _transfer(prefundToken, account_, withdraw_);
        }
        emit Claim(index_, account_, claimableAmount_, allocation_, withdraw_, energy_);
    }

    function sync() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _sync(prefundToken, msg.sender, prefunded);
    }

    function _prefund(uint prefundAmount_, address prefunder_) internal {
        _transferFrom(prefundToken, prefunder_, address(this), prefundAmount_);
        prefunded += prefundAmount_;
        _prefunds[prefunder_] += prefundAmount_;
        emit Prefund(prefunder_, prefundAmount_);
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
}
