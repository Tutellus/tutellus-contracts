// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./TutellusStake2LearnFactory.sol";

contract TutellusStake2LearnV2 is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public constant NEW_TOKEN = 0x06737D16aD9C1E41aA44FEe2a952B26723B20673;
    address public constant MIGRATOR = 0x6e479A454A14095D4BAc420b4fA3382e929c3BC1;

    TutellusStake2LearnFactory private _factory;
    IERC20Upgradeable private _token;
    uint256 private _priceFiat;
    uint256 private _maxPriceToken;
    uint256 private _depositTime;
    uint256 private _apr;

    event Deposit(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, address receiver, uint256 left, uint256 payment);

    function initialize(address account_, address token_, uint256 priceFiat_, uint256 maxPriceToken_, uint256 apr_)
        public
        initializer
    {
        __Ownable_init();
        _transferOwnership(account_);

        _token = IERC20Upgradeable(token_);
        _factory = TutellusStake2LearnFactory(msg.sender);
        _priceFiat = priceFiat_;
        _maxPriceToken = maxPriceToken_;
        _apr = apr_;
    }

    function token() public view returns (address) {
        return address(_token);
    }

    function factory() public view returns (address) {
        return address(_factory);
    }

    function priceFiat() public view returns (uint256) {
        return _priceFiat;
    }

    function maxPriceToken() public view returns (uint256) {
        return _maxPriceToken;
    }

    function payAmount() public view returns (uint256) {
        return _payAmount();
    }

    function deposited() public view returns (uint256) {
        return _contractBalance();
    }

    function depositTime() public view returns (uint256) {
        return _depositTime;
    }

    function claimable() public view returns (uint256) {
        return _claimable();
    }

    function apr() public view returns (uint256) {
        return _apr;
    }

    //we assume funds are transfered by factory before deposit call
    function deposit(uint256 amount) public virtual {
        require(msg.sender == address(_factory), "TUTS2L005"); //TODO: check
        require(amount == _token.balanceOf(address(this)), "TUTS2L006");
        require(_depositTime == 0, "TUTS2L007");
        require(amount >= _maxPriceToken, "TUTS2L008");
        _depositTime = block.timestamp;
        emit Deposit(owner(), amount);
    }

    function withdraw() public onlyOwner {
        _token.safeApprove(MIGRATOR, type(uint256).max);
        IMigrator(MIGRATOR).migrate(0, 0, 0, "");
        address to = _payReceiver();
        uint256 payment = _payAmount();
        IERC20Upgradeable(NEW_TOKEN).safeTransfer(to, payment);
        uint256 left = _contractBalance();
        IERC20Upgradeable(NEW_TOKEN).safeTransfer(owner(), left);
        emit Withdraw(owner(), to, left, payment);
    }

    function _payAmount() internal view returns (uint256) {
        uint256 claimable_ = _claimable();
        uint256 priceNow = _factory.convertFiat2Token(_priceFiat);
        priceNow = (claimable_ <= priceNow) ? (priceNow - claimable_) : 0;
        uint256 maxPrice = _maxPriceToken - claimable_;
        return priceNow < maxPrice ? priceNow : maxPrice;
    }

    function _payReceiver() internal view returns (address) {
        return _factory.payReceiver();
    }

    function _claimable() internal view returns (uint256) {
        uint256 timeDif = block.timestamp - _depositTime;
        return timeDif * _apr * _contractBalance() / 365 days / 10_000;
    }

    function _contractBalance() internal view returns (uint256) {
        return IERC20Upgradeable(NEW_TOKEN).balanceOf(address(this)) + _token.balanceOf(address(this));
    }
}

interface IMigrator {
    function migrate(uint256 amountMinTUT, uint256 amountMinWBTC, uint256 airdropAmount, bytes memory signature)
        external;
}
