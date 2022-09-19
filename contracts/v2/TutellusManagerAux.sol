// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusManager.sol";

/// @title The contract of TutellusManagerAux
/// @notice Manages smart contracts deployments, ids and protocol roles
contract TutellusManagerAux is
    UUPSUpgradeableByRole
{

    function initialize ()
        public
        initializer
    {
        __AccessControlProxyPausable_init(msg.sender);
    }

    /** PUBLIC METHODS */
    function setIdBatch (
        bytes32[] calldata ids,
        address[] calldata implementations
    )
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(ids.length == implementations.length, "TutellusManagerAux: ids and implementations must have the same length");
        for (uint256 i = 0; i < ids.length; i++) {
            ITutellusManager(config).setId(ids[i], implementations[i]);
        }
    }
}
