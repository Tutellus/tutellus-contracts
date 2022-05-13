// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract WhitelistMock {
    function whitelisted(
        address account
    ) public pure returns (bool) {
        require(account != address(0));
        return true;
    }
}