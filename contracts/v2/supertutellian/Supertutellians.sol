// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusRewardsVaultV2.sol";

contract Supertutellians is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable, //Ready to use in future upgrades
    ERC721BurnableUpgradeable,
    UUPSUpgradeableByRole
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct Supertutellian {
        uint256 balance;
        uint256 rewardDebt;
        uint256 mintDate;
        address minter;
    }

    struct General {
        uint256 accRewardsPerShare;
        uint256 released;
        uint256 lastUpdate;
        uint256 balance;
    }

    bytes32 internal constant _ST_ADMIN_ROLE = keccak256("ST_ADMIN_ROLE");
    uint256 public constant LOCK_TIME = 365 days;

    CountersUpgradeable.Counter private tokenIdCounter;
    uint256 private _deployTimestamp;
    ITutellusRewardsVaultV2 public vault;
    IERC20Upgradeable public token;
    General public general;

    mapping(uint256 => Supertutellian) public supertutellians;
    mapping(address => uint256) public minDepositAmounts;

    event InitSupertutellian(address vault, address token);

    /// @notice Event emitted when the staking account deposits funds
    event Deposit(uint256 indexed tokenId, address indexed account, uint256 amount);

    /// @notice Event emitted when the staking account withdraws funds
    event Withdraw(uint256 indexed tokenId, address indexed account, uint256 amount);

    /// @notice Event emitted when the staking account claims rewards
    event Claim(uint256 indexed tokenId, address indexed account, uint256 amount);

    /// @notice Event emitted when the staking account receives rewards
    event Rewards(uint256 indexed tokenId, address indexed account, uint256 amount);

    /// @notice Event emitted when real balance and virtual balance are synced
    event SyncBalance(address indexed recipient, uint256 amount);

    /// @notice Event emitted when the staking contract is updated
    event Update(uint256 accRewardsPerShare, uint256 released, uint256 lastUpdate);

    modifier onEachAction(uint256 tokenId) {
        _onEachAction(tokenId);
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        __ERC721_init("Supertutellians", "STUT");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __ERC721Burnable_init();

        _deployTimestamp = block.timestamp; //solhint-disable-line not-rely-on-time
        general.lastUpdate = block.timestamp; //solhint-disable-line not-rely-on-time
        address _token = ITutellusManager(config).get(keccak256("TUT"));
        address _vault = ITutellusManager(config).get(keccak256("SUPERTUTELLIANS_REWARDS"));
        token = IERC20Upgradeable(_token);
        vault = ITutellusRewardsVaultV2(_vault);

        emit InitSupertutellian(_vault, _token);
    }

    function syncBalance(address recipient) public onlyRole(_ST_ADMIN_ROLE) {
        uint256 amount = token.balanceOf(address(this)) - general.balance;
        token.safeTransfer(recipient, amount);
        emit SyncBalance(recipient, amount);
    }

    function setMinDepositAmounts(address[] calldata accounts, uint256[] calldata amounts)
        public
        onlyRole(_ST_ADMIN_ROLE)
    {
        require(accounts.length == amounts.length, "");
        uint256 len = accounts.length;
        for (uint256 i; i < len; ++i) {
            minDepositAmounts[accounts[i]] = amounts[i];
        }
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    function balance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function pendingRewards(uint256 tokenId) public view returns (uint256) {
        return _pendingRewards(tokenId);
    }

    function canWithdraw(uint256 tokenId) public view returns (bool) {
        return _canWithdraw(tokenId);
    }

    function minDepositAmount(address account) public view returns (uint256) {
        if (minDepositAmounts[account] != 0) return minDepositAmounts[account];

        uint256 blockTimestamp = block.timestamp; //solhint-disable-line not-rely-on-time
        uint256 range = 60 days;
        uint256 min = 25000 ether;
        uint256 max = 60000 ether;

        if (blockTimestamp < _deployTimestamp + range) {
            return min + ((max - min) * (blockTimestamp - _deployTimestamp) / range);
        } else {
            return max;
        }
    }

    function deposit(address account, uint256 amount) public returns (uint256 tokenId) {
        require(amount >= minDepositAmount(account), "");
        tokenId = tokenIdCounter.current();
        supertutellians[tokenId] = Supertutellian({
            balance: amount,
            rewardDebt: amount * general.accRewardsPerShare / 1 ether,
            mintDate: block.timestamp, //solhint-disable-line not-rely-on-time
            minter: account
        });
        general.balance += amount;
        token.safeTransferFrom(account, address(this), amount);
        _safeMint(account);
        emit Deposit(tokenId, account, amount);
    }

    function withdraw(uint256 tokenId) public {
        require(_canWithdraw(tokenId), "");
        address account = ownerOf(tokenId);
        claim(tokenId);
        uint256 amount = supertutellians[tokenId].balance;
        general.balance -= amount;
        _burn(tokenId);
        token.safeTransfer(account, amount);
        emit Withdraw(tokenId, account, amount);
    }

    function claim(uint256 tokenId) public {
        require(_canWithdraw(tokenId), "");
        _update();
        uint256 pending = _pendingRewards(tokenId);
        require(pending != 0, "Staking: 004");
        _reward(tokenId);
        supertutellians[tokenId].rewardDebt = supertutellians[tokenId].balance * general.accRewardsPerShare / 1 ether;

        emit Claim(tokenId, ownerOf(tokenId), pending);
    }

    function _canWithdraw(uint256 tokenId) internal view returns (bool) {
        return block.timestamp > LOCK_TIME + supertutellians[tokenId].mintDate; //solhint-disable-line not-rely-on-time
    }

    function _safeMint(address to) internal returns (uint256 tokenId) {
        tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function _pendingRewards(uint256 tokenId) internal view returns (uint256) {
        uint256 _balance = token.balanceOf(address(this));
        uint256 _accRewardsPerShare = general.accRewardsPerShare;
        // solhint-disable-next-line not-rely-on-time
        if (_balance != 0 && block.timestamp > general.lastUpdate) {
            uint256 _released = vault.released(address(this)) - general.released;
            _accRewardsPerShare = _accRewardsPerShare + (_released * 1 ether / _balance);
        }
        return (supertutellians[tokenId].balance * _accRewardsPerShare / 1 ether) - supertutellians[tokenId].rewardDebt;
    }

    function _update() internal {
        uint256 balance_ = token.balanceOf(address(this));

        if (balance_ == 0) {
            general.lastUpdate = block.timestamp; // solhint-disable-line not-rely-on-time
            return;
        }

        uint256 released = vault.released(address(this)) - general.released;
        general.released += released;
        general.accRewardsPerShare = general.accRewardsPerShare + (released * 1 ether / balance_);
        general.lastUpdate = block.timestamp; // solhint-disable-line not-rely-on-time
        emit Update(general.accRewardsPerShare, general.released, general.lastUpdate);
    }

    function _burnFrom(uint256 tokenId, uint256 amount) internal onEachAction(tokenId) {
        supertutellians[tokenId].balance -= amount;
        supertutellians[tokenId].rewardDebt = supertutellians[tokenId].balance * general.accRewardsPerShare / 1 ether;
        general.balance -= amount;
        ERC20BurnableUpgradeable(address(token)).burn(amount);
    }

    function _onEachAction(uint256 tokenId) internal {
        _update();
        _reward(tokenId);
    }

    function _reward(uint256 tokenId) internal {
        if (supertutellians[tokenId].balance > 0) {
            uint256 pending = (supertutellians[tokenId].balance * general.accRewardsPerShare / 1 ether)
                - supertutellians[tokenId].rewardDebt;
            if (pending != 0) {
                address account = ownerOf(tokenId);
                vault.distribute(account, pending);
                emit Rewards(tokenId, account, pending);
            }
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        delete supertutellians[tokenId];
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
