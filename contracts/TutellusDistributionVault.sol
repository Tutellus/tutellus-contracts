// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/ITutellusERC20.sol";
import "./utils/AccessControlPausableUpgradeable.sol";

contract TutellusDistributionVault is AccessControlPausableUpgradeable {

    address public token;

    struct Stakeholder{
        uint256 distributed;
        uint256 releasePerBlock;
        uint startBlock;
        uint endBlock;
    }

    event Update(address account);
    event Distribute(address sender, address account, uint256 amount);
    event MigrateStakeholder(address from, address to);
    event AddStakeholder(address stakeholder, uint256 allocated, uint startBlock, uint endBlock);

    mapping (address=>Stakeholder) public stakeholders;

    function __TutellusDistributionVault_init(address token_, uint256 amount) internal initializer {
      __AccessControlPausableUpgradeable_init();
      __TutellusDistributionVault_init_unchained(token_, amount);
    }

    function __TutellusDistributionVault_init_unchained(address token_, uint256 amount) internal initializer {
      token = token_;
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      tokenInterface.mint(address(this), amount);
    }

    function _resetStakeholder(address account) internal {
      stakeholders[account].distributed = 0;
      stakeholders[account].releasePerBlock = 0;
      stakeholders[account].endBlock = 0;
      stakeholders[account].startBlock = 0;
    }

    function allocated(address account) public view returns(uint256){
      if(releasePerBlock(account) > 0) {
        return (endBlock(account) - startBlock(account)) / releasePerBlock(account);
      } else {
        return 0;
      }
    }

    function released(address account) public view returns(uint256){
      if (allocated(account) > 0) {
        if (block.number > endBlock(account)) {
          return allocated(account);
        } else {
          if (block.number > startBlock(account)) {
            return (block.number - startBlock(account)) * releasePerBlock(account);
          } else {
            return 0;
          }
        }
      } else {
        return 0;
      }
    }

    function distributed(address account) public view returns(uint256){
      return stakeholders[account].distributed;
    }

    function releasePerBlock(address account) public view returns(uint256){
      return stakeholders[account].releasePerBlock;
    }

    function endBlock(address account) public view returns(uint256){
      return stakeholders[account].endBlock;
    }

    function startBlock(address account) public view returns(uint256){
      return stakeholders[account].startBlock;
    }

    function available(address account) public view returns(uint256){
      return released(account) - distributed(account);
    }

    function distribute(address account) public whenNotPaused {
      ITutellusERC20 tokenInterface = ITutellusERC20(token);
      uint256 amount = available(account);
      require(amount >= 0, "TutellusDistributionVault: No available tokens");
      stakeholders[account].distributed += amount;
      tokenInterface.transfer(account, amount);
      emit Distribute(msg.sender, account, amount);
    }

    function claim() public {
        address account = msg.sender;
        distribute(account);
    }

    function addStakeholder(address account, uint256 allocated_, uint startBlocks, uint endBlocks) public onlyRole(DEFAULT_ADMIN_ROLE){
        require(endBlocks > startBlocks, "TutellusDistributionVault: endBlock must be after startBlock");
        stakeholders[account].distributed = 0;
        stakeholders[account].releasePerBlock = allocated_ / (endBlocks - startBlocks);
        stakeholders[account].startBlock = block.number + startBlocks;
        stakeholders[account].endBlock = block.number + endBlocks;
        emit AddStakeholder(account, allocated_, stakeholders[account].startBlock, stakeholders[account].endBlock);
    }

    function migrateStakeholder(address from, address to) public onlyRole(DEFAULT_ADMIN_ROLE) {
      require(releasePerBlock(to) > 0, "TutellusDistributionVault: new address is already a stakeholder");
      stakeholders[to].distributed = stakeholders[from].distributed;
      stakeholders[to].releasePerBlock = stakeholders[from].releasePerBlock;
      stakeholders[to].endBlock = stakeholders[from].endBlock;
      _resetStakeholder(from);
      emit MigrateStakeholder(from, to);
    }

    function initialize(address token_, uint256 amount) public {
      __TutellusDistributionVault_init(token_, amount);
    }
}