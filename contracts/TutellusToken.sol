// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/Token.sol";
import "./DistributionVault.sol";

contract TutellusToken is Token {

    DistributionVault private _vault;

    constructor() Token('Tutellus Token', 'TUT', 2e26) {
        _vault = new DistributionVault();
        _vault.initialize(address(this));
        _vault.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(keccak256('MINTER_ROLE'), vault());
    }

    function vault() public view returns (address) {
        return address(_vault);
    }
}