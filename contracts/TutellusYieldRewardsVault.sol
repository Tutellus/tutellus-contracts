// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/AccessControlPausableUpgradeable.sol";
import "./TutellusStakingProxy.sol";
import "./interfaces/ITutellusERC20.sol";

contract TutellusYieldRewardsVault is AccessControlPausableUpgradeable {

    uint256 private _allocationStaking;
    uint256 private _allocationFarming;
    uint256 private _lastUpdate;
    uint256 private _releasedStaking;
    uint256 private _releasedFarming;
    uint private _startBlock;
    uint private _endBlock;
    uint private _increment;

    address public token;
    address public stakingProxy;
    address public farmingProxy;

    function updateAllocation(uint256[] memory allocation) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _releasedStaking = releasedStaking();
        _releasedFarming = releasedFarming();
        _allocationStaking = allocation[0];
        _allocationFarming = allocation[1];
        _lastUpdate = block.number;
    }

    function released() public view returns (uint256) {
      return releasedRange(block.number, _startBlock);
    }

    function releasedRange(uint from, uint to) public view returns (uint256) {
      require(from < to, "TutellusYieldTutellusYieldRewardstoken: {from} is after {to}");
      if (to > _endBlock) to = _endBlock;
      if (from < _startBlock) from = _startBlock;
      uint256 comp0 = (_increment * ((to - _startBlock) ** 2)) / 2;
      uint256 comp1 = (_increment * ((from - _startBlock) ** 2)) / 2;
      return comp0 - comp1;
    }

    function releasedStaking() public view returns (uint256) {
      return _releasedStaking + releasedRange(block.number, _lastUpdate) * _allocationStaking / 1e20;
    }
    
    function releasedFarming() public view returns (uint256) {
       return _releasedFarming + releasedRange(block.number, _lastUpdate) * _allocationFarming / 1e20;
    }

    function distributeTokens(address account, uint256 amount) public onlyRole("PROXY_ROLE") {
      // Limitar distribución a releasing
        ITutellusERC20 tokenInterface = ITutellusERC20(token);
        tokenInterface.transfer(account, amount);
    }

    // Initializes the contract
    function initialize(address token_, uint256[] memory allocation, uint256 amount, uint blocks) public {
      __TutellusYieldRewardsVault_init(token_, allocation, amount, blocks);
    }

    function __TutellusYieldRewardsVault_init(address token_, uint256[] memory allocation, uint256 amount, uint blocks) internal initializer {
      __AccessControlPausableUpgradeable_init();
      __TutellusYieldRewardsVault_init_unchained(token_, allocation, amount, blocks);
    }

    function __TutellusYieldRewardsVault_init_unchained(address token_, uint256[] memory allocation, uint256 amount, uint blocks) internal initializer {
        token = token_;
        ITutellusERC20 tokenInterface = ITutellusERC20(token);
        tokenInterface.mint(address(this), amount);

        // TO DO PROXY
        stakingProxy = address(new TutellusStakingProxy());
        farmingProxy = address(new TutellusStakingProxy());
        grantRole("PROXY_ROLE", stakingProxy);
        grantRole("PROXY_ROLE", farmingProxy);

        updateAllocation(allocation);
        _startBlock = block.number;
        _endBlock = block.number + blocks;
        _increment = (2 * amount) / (blocks ** 2);
    }
}
