// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/UUPSUpgradeableByRole.sol";

contract IDOV2Mock is UUPSUpgradeableByRole {

    function initialize(
        address rolemanager_,
        uint256 fundingAmount_,
        uint256 minPrefund_,
        address idoToken_,
        address prefundToken_,
        uint256 startDate_,
        uint256 endDate_,
        uint256 openDate_,
        uint256 cliffTime_
    ) public pure {
        rolemanager_;
        fundingAmount_;
        minPrefund_;
        idoToken_;
        prefundToken_;
        startDate_;
        endDate_;
        openDate_;
        cliffTime_;
    }

    function idoVersion() public pure returns(string memory) {
        return "IDO-V2";
    }
}