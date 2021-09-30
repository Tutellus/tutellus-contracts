// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControlPausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";

abstract contract RedPillERC20 is AccessControlPausableUpgradeable, ERC20CappedUpgradeable {

    uint256 private burned_;

    function __RedPillERC20_init(string memory name, string memory symbol, uint256 cap) internal initializer {
        __AccessControlPausableUpgradeable_init();
        __ERC20_init(name, symbol);
        __ERC20Capped_init(cap);
        __RedPillERC20_init_unchained();
    }

    function __RedPillERC20_init_unchained() internal initializer {
    }

    function _mint(address account, uint256 amount) virtual internal override {
        require(totalSupply() + burned_ + amount <= cap(), "RedPillERC20: mint amount exceeds cap");
        super._mint(account, amount);
    }

    function _burn(address account, uint256 amount) virtual internal override {
        require(totalSupply() - burned_ >= amount, "RedPillERC20: burn amount exceeds supply");
        burned_ += amount;
        super._burn(account, amount);
    }

    function burned() public view returns (uint256) {
        return burned_;
    }

    function mint(address account, uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(account, amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}