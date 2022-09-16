// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/UUPSUpgradeableByRole.sol";

contract IDOV2Mock is UUPSUpgradeableByRole {

    function initialize(
        address rolemanager_,
        uint256 fundingAmount_,
        uint256 minPrefund_,
        address prefundToken_,
        uint256 openDate_
    ) public pure {
        rolemanager_;
        fundingAmount_;
        minPrefund_;
        prefundToken_;
        openDate_;
    }

    function idoVersion() public pure returns(string memory) {
        return "IDO-V2";
    }
}