// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "contracts/utils/CoinCharger.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";

contract TutellusIDO is UUPSUpgradeableByRole, CoinCharger {
    uint256 public prefunded;
    uint256 public fundingAmount;
    uint256 public minPrefund;
    uint256 public startDate;
    uint256 public openDate;
    uint256 public endDate;
    address public idoToken;
    address public prefundToken;
    bytes32 public merkleRoot;
    string public uri;
    bool public closed;

    mapping(address => uint256) private _claimed;
    mapping(address => bool) private _withdrawn;
    mapping(address => uint256) private _prefunds;

    event Prefund(address indexed funder, uint256 amount);
    event Withdraw(address indexed funder, uint256 amount);
    event RemovePrefunder(address indexed funder);
    event UpdateMerkleRoot(bytes32 merkleRoot, string uri);
    event Claim(
        uint256 index,
        address account,
        uint256 amount,
        uint256 allocation,
        uint256 withdraw,
        uint256 energy
    );
    event Closed(bool closed);

    modifier isNotClosed() {
        require(!closed, "TutellusIDO: IDO is closed");
        _;
    }

    modifier isOpen() {
        require(block.timestamp > openDate, "TutellusIDO: IDO is not open");
        _;
    }

    function initialize(
        address rolemanager_,
        uint256 fundingAmount_,
        uint256 minPrefund_,
        address idoToken_,
        address prefundToken_,
        uint256 startDate_,
        uint256 endDate_,
        uint256 openDate_
    ) public initializer {
        __AccessControlProxyPausable_init(rolemanager_);
        fundingAmount = fundingAmount_;
        minPrefund = minPrefund_;
        idoToken = idoToken_;
        prefundToken = prefundToken_;
        startDate = startDate_;
        endDate = endDate_;
        openDate = openDate_;
    }

    function getPrefunded(address prefunder_) public view returns (uint256) {
        return _prefunds[prefunder_];
    }

    function released(uint256 allocation) public view returns (uint256) {
        return
            block.timestamp > endDate ? allocation : block.timestamp > startDate
                ? (allocation * (block.timestamp - startDate)) /
                    (endDate - startDate)
                : 0;
    }

    function available(address account, uint256 allocation)
        public
        view
        returns (uint256)
    {
        return released(allocation) - _claimed[account];
    }

    function open() public onlyRole(DEFAULT_ADMIN_ROLE) {
        closed = false;
        emit Closed(closed);
    }

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        merkleRoot = merkleRoot_;
        uri = uri_;
        closed = true;
        emit UpdateMerkleRoot(merkleRoot, uri);
        emit Closed(closed);
    }

    function prefund(address prefunder_, uint256 prefundAmount_)
        public
        isOpen
        isNotClosed
    {
        require(
            prefundAmount_ >= minPrefund,
            "TutellusIDO: insufficient prefund"
        );
        _prefund(prefundAmount_, prefunder_);
    }

    function withdrawAll() public isNotClosed {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, _prefunds[prefunder_]);

        emit RemovePrefunder(prefunder_);
    }

    function withdraw(uint256 amount_) public isNotClosed {
        address prefunder_ = _msgSender();
        _withdraw(prefunder_, amount_);
        require(
            _prefunds[prefunder_] >= minPrefund,
            "TutellusIDO: try withdrawAll"
        );
    }

    function claim(
        uint256 index_,
        address account_,
        uint256 allocation_,
        uint256 withdraw_,
        uint256 energy_,
        bytes32[] calldata merkleProof_
    ) public {
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
        if ((!_withdrawn[account_]) && (withdraw_ > 0)) {
            _withdrawn[account_] = true;
            _transfer(prefundToken, account_, withdraw_);
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

    function sync() public onlyRole(DEFAULT_ADMIN_ROLE) {
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
}
