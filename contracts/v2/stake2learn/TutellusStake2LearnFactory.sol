// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "./Stake2XFactory.sol";
import "./ITutellusStake2Learn.sol";

contract TutellusStake2LearnFactory is Stake2XFactory, UUPSUpgradeableByRole {
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
        address stakingContract,
        address[] memory feeds,
        bool[] memory inverts
    ) public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        __Stake2XFactory_initialize("TUT_S2L", "1", token, poolAddress, stakingContract, feeds, inverts);
        _upgradeByImplementation(implementation);
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
            ITutellusStake2Learn.initialize.selector,
            config,
            account,
            token(),
            stakingContract(),
            priceFiat,
            maxPriceToken
        );
        address proxy = _createProxy(initializeCalldata);
        IERC20Upgradeable(token()).transferFrom(account, proxy, amount);
        ITutellusStake2Learn(proxy).deposit(amount);
        emit CreateS2L(id, account, proxy, amount, priceFiat, maxPriceToken);
        return proxy;
    }

    //override required by Stake2XFactory
    function _canUpgradeByImplementation(address implementation, address sender)
        internal
        virtual
        override (Stake2XFactory)
        returns (bool)
    {
        (implementation);
        return hasRole(UPGRADER_ROLE, sender);
    }
}
