// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "../utils/CoinCharger.sol";
import "../utils/AccessControlProxyPausable.sol";

contract TutellusIDO is AccessControlProxyPausable, CoinCharger {

    address public token;
    uint public prefunded;
    uint public fundingAmount;
    uint public minPrefundSuper;
    uint public minPrefund;
    bytes32 public merkleRoot;
    string public uri;

    mapping(address => uint) private _claimed;
    mapping(address => mapping(bool => uint)) private _prefunds;

    event Prefund(bool indexed asSupertutellian, address indexed funder, uint indexed faction, uint amount);
    event Withdraw(bool indexed asSupertutellian, address indexed funder, uint amount);
    event RemovePrefunder(bool indexed asSupertutellian, address indexed funder);
    event UpdateMerkleRoot(bytes32 merkleRoot, string uri);
    event Claim(uint256 index, address account, uint256 amount);

    modifier onlySupertutellian() {
        require(_isSupertutellian(_msgSender()), "TutellusIDO: not supertutellian");
        _;
    }

    constructor(address rolemanager, address token_) {
        __TutellusClientsVault_init(rolemanager, token_);
    }

    function __TutellusClientsVault_init(address rolemanager, address token_) internal initializer {
        __AccessControlProxyPausable_init(rolemanager);
        __TutellusClientsVault_init_unchained(token_);
    }

    function __TutellusClientsVault_init_unchained(address token_) internal initializer {
        token = token_;
    }

    function initialize(
        address token_,
        uint fundingAmount_,
        uint minPrefundSuper_,
        uint minPrefund_
    )
        public
        initializer
    {
        token = token_;
        fundingAmount = params_[0];
        minPrefundSuper = params_[1];
        minPrefund = params_[2];
    }

    function getPrefunded(address prefunder_) public view returns(uint) {
        return _prefunds[prefunder_];
    }

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = merkleRoot_;
        uri = uri_;
        emit UpdateMerkleRoot(merkleRoot, uri);
    }

    function prefundAsTutellian(uint prefund_) public {
        address prefunder_ = _msgSender();
        require(prefund_ >= minPrefund, "TutellusIDO: insufficient prefund");
        _prefund(prefund, prefunder_, false);
    }

    function prefundAsSupertutellian(uint prefund_) public onlySupertutellian() {
        address prefunder_ = _msgSender();
        require(prefund_ >= minPrefundSuper, "TutellusIDO: insufficient prefundSuper");
        _prefund(prefund, prefunder_, true);
    }

    function withdrawAll(bool supertutellian_) public {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, _prefunds[prefunder_][supertutellian_], supertutellian_);

        emit RemovePrefunder(supertutellian_, prefunder_);
    }

    function withdrawAsTutellian(uint amount_) public {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_, false);
        require(_prefunds[prefunder_][false] >= minPrefund, "TutellusIDO: try withdrawAllTutellian");
    }

    function withdrawAsSupertutellian(uint amount_) public /*onlySupertutellian()*/ {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_, true);
        require(_prefunds[prefunder_][true] >= minPrefundSuper, "TutellusIDO: try withdrawAll");
    }

    function claim(uint index_, address account_, uint amount_, bytes32[] calldata merkleProof_) public {
        uint claimableAmount_ = amount_ - _claimed[account_];
        require(claimableAmount_ > 0, "TutellusIDO: nothing to claim");
        _claimed[account_] += claimableAmount_;
        _verifyMerkle(index_, account_, amount_, merkleProof_);
        _transfer(token, account_, amount_);
        emit Claim(index_, account_, amount_);
    }

    function sync() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _sync(token, msg.sender, prefunded);
    }

    function _prefund(uint prefund_, address prefunder_, bool supertutellian_) internal {
        _transferFrom(token, prefunder_, address(this), prefund_);
        prefunded += prefund_;
        _prefunds[prefunder_][supertutellian_] += prefund_;
        emit Prefund(supertutellian_, prefunder_, _getFaction(prefunder_), prefund_);
    }

    function _withdraw(address prefunder_, uint amount_, bool supertutellian_) internal {
        prefunded -= amount_;
        _prefunds[prefunder_][supertutellian_] += amount_;
        _transfer(token, prefunder_, amount_);

        emit Withdraw(supertutellian_, prefunder_, amount_);
    }

    function _verifyMerkle(uint index_, address account_, uint amount_, bytes32[] calldata merkleProof_) internal view {
        bytes32 node_ = keccak256(abi.encodePacked(index_, account_, amount_));
        require(MerkleProofUpgradeable.verify(merkleProof_, merkleRoot_, node_), "TutellusIDO: Invalid merkle proof");
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
