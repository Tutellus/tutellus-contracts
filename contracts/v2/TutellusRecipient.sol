// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/UUPSUpgradeableByRole.sol";

/// @title The contract of TutellusRecipient
/// @notice Holds TUT tokens for protocol rewards regarding TUT-IP1
/// @notice https://snapshot.org/#/tutellusdao.eth/proposal/0x80960d54d10e2ee891065c596ccffac0ddc7ba79ce371ccaeca78ba3778d44b5
contract TutellusRecipient is UUPSUpgradeableByRole {
    function initialize ()
        public
        initializer
    {
        __AccessControlProxyPausable_init(msg.sender);
    }
}