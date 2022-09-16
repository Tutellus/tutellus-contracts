// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "contracts/utils/CoinCharger.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusWhitelist.sol";
import "contracts/interfaces/ITutellusIDO.sol";

contract TutellusIDO is ITutellusIDO, UUPSUpgradeableByRole, CoinCharger {
    /// @inheritdoc ITutellusIDO
    uint256 public prefunded;

    /// @inheritdoc ITutellusIDO
    uint256 public fundingAmount;

    /// @inheritdoc ITutellusIDO
    uint256 public minPrefund;

    /// @inheritdoc ITutellusIDO
    uint256 public openDate;

    /// @inheritdoc ITutellusIDO
    uint256 public startDate;

    /// @inheritdoc ITutellusIDO
    uint256 public cliffTime;

    /// @inheritdoc ITutellusIDO
    uint256 public endDate;

    /// @inheritdoc ITutellusIDO
    address public idoToken;

    /// @inheritdoc ITutellusIDO
    address public prefundToken;

    /// @inheritdoc ITutellusIDO
    bytes32 public merkleRoot;

    /// @inheritdoc ITutellusIDO
    string public uri;

    /// @inheritdoc ITutellusIDO
    bool public closed;

    mapping(address => uint256) private _claimed;
    mapping(address => bool) private _withdrawn;
    mapping(address => uint256) private _prefunds;
    mapping(address => bool) private _termsAndConditions;

    bytes32 public constant IDO_ADMIN_ROLE = keccak256("IDO_ADMIN_ROLE");

    modifier isNotClosed() {
        require(!closed, "TutellusIDO: IDO is closed");
        _;
    }

    modifier isClosed() {
        require(closed, "TutellusIDO: IDO is not closed");
        _;
    }

    modifier isOpen() {
        require(block.timestamp > openDate, "TutellusIDO: IDO is not open");
        _;
    }

    modifier isWhitelisted(address account) {
        require(
            _isWhitelisted(account),
            "TutellusIDO: address not whitelisted"
        );
        _;
    }

    modifier isPrefunder(address prefunder) {
        require(
            _msgSender() == prefunder,
            "TutellusIDO: not prefunder"
        );
        _;
    }

    modifier acceptedTermsAndConditions(address account) {
        require(
            _termsAndConditions[account],
            "TutellusIDO: address not accepted terms and conditions"
        );
        _;
    }

    modifier isClaimTime() {
        require(block.timestamp >= startDate + cliffTime, "TutellusIDO: not claim time");
        _;
    }

    /// @inheritdoc ITutellusIDO
    function initialize(
        address rolemanager_,
        uint256 fundingAmount_,
        uint256 minPrefund_,
        address prefundToken_,
        uint256 openDate_
    ) public initializer {
        __AccessControlProxyPausable_init(rolemanager_);
        fundingAmount = fundingAmount_;
        minPrefund = minPrefund_;
        prefundToken = prefundToken_;
        openDate = openDate_;
    }

    /// @inheritdoc ITutellusIDO
    function getPrefunded(address prefunder_) public view returns (uint256) {
        return _prefunds[prefunder_];
    }

    /// @inheritdoc ITutellusIDO
    function getAcceptedTermsAndConditions(address account)
        public
        view
        returns (bool)
    {
        return _termsAndConditions[account];
    }

    /// @inheritdoc ITutellusIDO
    function acceptTermsAndConditions() public isWhitelisted(msg.sender) {
        _termsAndConditions[msg.sender] = true;
        emit AcceptTermsAndConditions(msg.sender);
    }

    /// @inheritdoc ITutellusIDO
    function claimed(address account) public view returns (uint256) {
        return _claimed[account];
    }

    /// @inheritdoc ITutellusIDO
    function withdrawn(address account) public view returns (bool) {
        return _withdrawn[account];
    }

    /// @inheritdoc ITutellusIDO
    function released(uint256 allocation) public view returns (uint256) {
        return
            block.timestamp > endDate ? allocation : block.timestamp > startDate
                ? (allocation * (block.timestamp - startDate)) /
                    (endDate - startDate)
                : 0;
    }

    /// @inheritdoc ITutellusIDO
    function available(address account, uint256 allocation)
        public
        view
        returns (uint256)
    {
        return released(allocation) - _claimed[account];
    }

    /// @inheritdoc ITutellusIDO
    function open() public onlyRole(IDO_ADMIN_ROLE) {
        closed = false;
        emit Closed(closed);
    }

    /// @inheritdoc ITutellusIDO
    function close() public onlyRole(IDO_ADMIN_ROLE) {
        closed = true;
        emit Closed(closed);
    }

    /// @inheritdoc ITutellusIDO
    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_)
        public
        isClosed
        onlyRole(IDO_ADMIN_ROLE)
    {
        merkleRoot = merkleRoot_;
        uri = uri_;
        emit UpdateMerkleRoot(merkleRoot, uri);
    }

    /// @inheritdoc ITutellusIDO
    function updateIdoToken(address idoToken_) public onlyRole(IDO_ADMIN_ROLE) {
        idoToken = idoToken_;
        emit UpdateIdoToken(idoToken);
    }

    /// @inheritdoc ITutellusIDO
    function updateOpenDate(uint256 openDate_) public onlyRole(IDO_ADMIN_ROLE) {
        openDate = openDate_;
        emit UpdateOpenDate(openDate_);
    }

    /// @inheritdoc ITutellusIDO
    function updateVesting(uint256 startDate_, uint256 endDate_, uint256 cliffTime_) public onlyRole(IDO_ADMIN_ROLE) {
        startDate = startDate_;
        endDate = endDate_;
        cliffTime = cliffTime_;
        emit UpdateVesting(startDate_, endDate_, cliffTime_);
    }

    /// @inheritdoc ITutellusIDO
    function withdrawProject(address projectWallet, uint256 fundAmount)
        public
        onlyRole(IDO_ADMIN_ROLE)
    {
        _transfer(prefundToken, projectWallet, fundAmount);
    }

    /// @inheritdoc ITutellusIDO
    function prefund(address prefunder_, uint256 prefundAmount_)
        public
        isOpen
        isNotClosed
        acceptedTermsAndConditions(prefunder_)
        isPrefunder(prefunder_)
    {
        require(
            prefundAmount_ + _prefunds[prefunder_] >= minPrefund,
            "TutellusIDO: insufficient prefund"
        );
        _prefund(prefundAmount_, prefunder_);
    }

    /// @inheritdoc ITutellusIDO
    function withdrawAll() public isNotClosed {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, _prefunds[prefunder_]);

        emit RemovePrefunder(prefunder_);
    }

    /// @inheritdoc ITutellusIDO
    function withdraw(uint256 amount_) public isNotClosed {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_);
        require(
            _prefunds[prefunder_] >= minPrefund,
            "TutellusIDO: try withdrawAll"
        );
    }

    /// @inheritdoc ITutellusIDO
    function withdrawLeft(
        uint256 index_,
        address account_,
        uint256 allocation_,
        uint256 withdraw_, //TBD: change to refund
        uint256 energy_,
        bytes32[] calldata merkleProof_
    ) public acceptedTermsAndConditions(account_) {
        _verifyMerkle(
            index_,
            account_,
            allocation_,
            withdraw_,
            energy_,
            merkleProof_
        );
        if ((!_withdrawn[account_]) && (withdraw_ > 0)) {
            _withdrawn[account_] = true;
            _transfer(prefundToken, account_, withdraw_);
        }
        emit WithdrawLeft(index_, account_, allocation_, withdraw_, energy_);
    }

    /// @inheritdoc ITutellusIDO
    function claim(
        uint256 index_,
        address account_,
        uint256 allocation_,
        uint256 withdraw_, //TBD: change to refund
        uint256 energy_,
        bytes32[] calldata merkleProof_
    ) public isClaimTime acceptedTermsAndConditions(account_) {
        require((startDate != 0) && (endDate != 0), "TutellusIDO: Wrong vesting dates");
        _verifyMerkle(
            index_,
            account_,
            allocation_,
            withdraw_,
            energy_,
            merkleProof_
        );
        uint256 claimableAmount_ = available(account_, allocation_);
        if (claimableAmount_ > 0) {
            _claimed[account_] += claimableAmount_;
            _transfer(idoToken, account_, claimableAmount_);
        }
        emit Claim(
            index_,
            account_,
            claimableAmount_,
            allocation_,
            withdraw_,
            energy_
        );
    }

    /// @inheritdoc ITutellusIDO
    function sync() public onlyRole(IDO_ADMIN_ROLE) {
        _sync(prefundToken, msg.sender, prefunded);
    }

    function _prefund(uint256 prefundAmount_, address prefunder_) internal {
        _transferFrom(prefundToken, prefunder_, address(this), prefundAmount_);
        prefunded += prefundAmount_;
        _prefunds[prefunder_] += prefundAmount_;
        emit Prefund(prefunder_, prefundAmount_);
    }

    function _withdraw(address prefunder_, uint256 amount_) internal {
        require(
            _prefunds[prefunder_] >= amount_,
            "TutellusIDO: cant withdraw more than prefunded"
        );
        prefunded -= amount_;
        _prefunds[prefunder_] -= amount_;
        _transfer(prefundToken, prefunder_, amount_);

        emit Withdraw(prefunder_, amount_);
    }

    function _verifyMerkle(
        uint256 index_,
        address account_,
        uint256 allocation_,
        uint256 withdraw_,
        uint256 energy_,
        bytes32[] calldata merkleProof_
    ) internal view {
        bytes32 node_ = keccak256(
            abi.encodePacked(index_, account_, allocation_, withdraw_, energy_)
        );
        require(
            MerkleProofUpgradeable.verify(merkleProof_, merkleRoot, node_),
            "TutellusIDO: Invalid merkle proof"
        );
    }

    function _isWhitelisted(address account) internal view returns (bool) {
        address whitelist = ITutellusManager(config).get(
            keccak256("WHITELIST")
        );
        return ITutellusWhitelist(whitelist).whitelisted(account);
    }
}
