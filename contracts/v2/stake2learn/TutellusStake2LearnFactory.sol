// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "./Stake2XFactory.sol";
import "./ITutellusStake2Learn.sol";

contract TutellusStake2LearnFactory is Stake2XFactory, UUPSUpgradeableByRole {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 internal constant _S2L_SIGNER_ROLE = keccak256("S2L_SIGNER_ROLE");

    event CreateS2L( //TBD: Rename to maxPriceToken
        bytes32 indexed id,
        address indexed account,
        address indexed proxy,
        uint256 deposit,
        uint256 price,
        uint256 maxTokenPrice
    );

    function initialize(
        address implementation,
        address token,
        address poolAddress,
        address[] memory feeds,
        bool[] memory inverts
    ) public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        __Stake2XFactory_init("TUT_S2L", "1", token, poolAddress, feeds, inverts);
        _upgradeByImplementation(implementation);
    }

    function payReceiver() public view returns (address) {
        return ITutellusManager(config).get(keccak256("S2L_RECEIVER"));
    }

    function createS2L(
        bytes32 id,
        uint256 amount,
        uint256 priceFiat,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) external returns (address) {
        require(hasRole(_S2L_SIGNER_ROLE, signer), "TUTS2L002");
        require(_verifySignature(id, priceFiat, deadline, signature, signer), "TUTS2L003");
        address account = msg.sender;
        uint256 maxPriceToken = _convertFiat2Token(priceFiat);
        require(amount >= maxPriceToken, "TUTS2L004");
        bytes memory initializeCalldata = abi.encodeWithSelector(
            ITutellusStake2Learn.initialize.selector, config, account, token(), priceFiat, maxPriceToken
        );
        address proxy = _createProxy(initializeCalldata);
        IERC20Upgradeable(token()).safeTransferFrom(account, proxy, amount);
        ITutellusStake2Learn(proxy).deposit(amount);
        emit CreateS2L(id, account, proxy, amount, priceFiat, maxPriceToken);
        return proxy;
    }

    //override required by Stake2XFactory
    function _canUpgradeByImplementation(address implementation, address sender)
        internal
        virtual
        override(Stake2XFactory)
        returns (bool)
    {
        (implementation);
        return hasRole(UPGRADER_ROLE, sender);
    }
}
