// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "./Stake2XFactory.sol";
import "./TutellusStake2Learn.sol";

contract TutellusStake2LearnFactory is Stake2XFactory, UUPSUpgradeableByRole {
    bytes32 internal constant _S2L_SIGNER_ROLE = keccak256("S2L_SIGNER_ROLE");

    event CreateS2L(bytes32 indexed id, address indexed account, address indexed proxy, uint256 deposit, uint256 price);

    function initialize(address token, address stakingContract, address[] memory feeds, bool[] memory inverts)
        public
        initializer
    {
        __AccessControlProxyPausable_init(msg.sender); //TBD: msg.sender?
        __Stake2XFactory_initialize("TUT_S2L", "1", token, stakingContract, feeds, inverts);
        _upgradeByImplementation(address(new TutellusStake2Learn())); //TBD: pass implementation address through param if code size exceeds
    }

    function createS2L(
        bytes32 id,
        uint256 amount,
        uint256 priceFiat,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) external returns (address) {
        require(hasRole(_S2L_SIGNER_ROLE, signer), "");
        require(_verifySignature(id, amount, priceFiat, deadline, signature, signer), "");
        address account = msg.sender;
        uint256 maxPriceToken = _convertFiat2Token(priceFiat);
        bytes memory initializeCalldata = abi.encodeWithSelector(
            TutellusStake2Learn.initialize.selector,
            config,
            account,
            amount,
            stakingContract(),
            priceFiat,
            maxPriceToken
        );
        address proxy = _createProxy(initializeCalldata);
        IERC20Upgradeable(token()).transferFrom(account, proxy, amount);
        TutellusStake2Learn(proxy).deposit(amount);
        emit CreateS2L(id, account, proxy, amount, priceFiat);
        return proxy;
    }
}
