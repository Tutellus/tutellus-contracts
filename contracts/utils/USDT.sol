// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {

    address public owner;

    constructor (string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        owner = msg.sender;
        _mint(owner, 1e28);
    }

    function mint(address account, uint256 amount) public {
        require(msg.sender == owner, "Token: only owner can mint");
        _mint(account, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
