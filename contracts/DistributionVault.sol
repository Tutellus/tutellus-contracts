// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IRedPillERC20.sol";
import "./utils/AccessControlPausableUpgradeable.sol";

contract DistributionVault is AccessControlPausableUpgradeable{

    address public token;

    struct Stakeholder{
        string name;
        uint256 allocated;
        uint256 released;
        uint256 distributed;
        uint256 releasePerBlock;
        uint startBlock;
        uint endBlock;
        uint lastUpdate;
    }

    event Distribute(address stakeholder, address account, uint256 amount, uint256 distributed);
    event Update(address stakeholder, uint256 released);
    event Claim(address stakeholder, uint256 amount);
    event MigrateStakeholder(address from, address to);
    event AddStakeholder(address stakeholder, string name, uint256 allocated, uint startBlock, uint endBlock);

    mapping (address=>Stakeholder) public stakeholders;
    address[] public stakeholdersArray;

    modifier update(address addr_) {
      Stakeholder storage sh = stakeholders[addr_];
      require(sh.allocated > 0, "DistributionVault: This address is not a stakeholder");
      sh.released = released(addr_);
      sh.lastUpdate = block.number;
      _;
    }

    function distributeTokens(address account, uint256 amount) public whenNotPaused update(_msgSender()) {
        require(amount > 0, "DistributionVault: Nothing to distribute");
        IRedPillERC20 tokenInterface = IRedPillERC20(token);
        uint256 available_ = available(_msgSender());
        require(available_ >= amount, "DistributionVault: No available tokens");
        stakeholders[_msgSender()].distributed += amount;
        require(tokenInterface.transfer(account, amount), "DistributionVault: Transfer failed");
        emit Distribute(_msgSender(), account, amount, stakeholders[_msgSender()].distributed);
    }

    function claim() external {
        distributeTokens(_msgSender(), available(_msgSender()));
    }

    function allocated(address addr_) public view returns(uint256){
      return stakeholders[addr_].allocated;
    }

    function released(address addr_) public view returns(uint256){
      Stakeholder memory sh = stakeholders[addr_];
      if(block.number > sh.startBlock){
        if(block.number >= sh.endBlock){
          return sh.allocated;
        }else{
          return sh.released + ((block.number - sh.lastUpdate) * sh.releasePerBlock);
        }
      }else{
        return 0;
      }
    }

    function distributed(address addr_) public view returns(uint256){
      return stakeholders[addr_].distributed;
    }

    function releasePerBlock(address addr_) public view returns(uint256){
      return stakeholders[addr_].releasePerBlock;
    }

    function endBlock(address addr_) public view returns(uint256){
      return stakeholders[addr_].endBlock;
    }

    function startBlock(address addr_) public view returns(uint256){
      return stakeholders[addr_].startBlock;
    }

    function lastUpdate(address addr_) public view returns(uint256){
      return stakeholders[addr_].lastUpdate;
    }

    function available(address addr_) public view returns(uint256){
      return released(addr_) - distributed(addr_);
    }

    function isStakeholder(address addr_) public view returns(bool){
      return stakeholders[addr_].allocated > 0;
    }

    function addStakeholder(address addr_, string calldata name_, uint256 allocated_, uint startBlocks_, uint endBlocks_) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(endBlocks_ > startBlocks_, "DistributionVault: endBlock must be after startBlock");
        stakeholders[addr_].name = name_;
        stakeholders[addr_].allocated = allocated_;
        stakeholders[addr_].released = 0;
        stakeholders[addr_].distributed = 0;
        stakeholders[addr_].releasePerBlock = allocated_ / (endBlocks_ - startBlocks_);
        stakeholders[addr_].startBlock = block.number + startBlocks_;
        stakeholders[addr_].endBlock = block.number + endBlocks_;
        stakeholders[addr_].lastUpdate = block.number + startBlocks_;
        stakeholdersArray.push(addr_);
        IRedPillERC20 tokenInterface = IRedPillERC20(token);
        tokenInterface.mint(address(this), allocated_);
        emit AddStakeholder(addr_, name_, allocated_, stakeholders[addr_].startBlock, stakeholders[addr_].endBlock);
    }

    function _resetStakeholder(address addr_) private {
      stakeholders[addr_].name = "";
      stakeholders[addr_].allocated = 0;
      stakeholders[addr_].released = 0;
      stakeholders[addr_].distributed = 0;
      stakeholders[addr_].releasePerBlock = 0;
      stakeholders[addr_].endBlock = 0;
      stakeholders[addr_].lastUpdate = 0;
    }

    function migrateStakeholder(address from, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
      require(!isStakeholder(to), "DistributionVault: new address is already a stakeholder");
      stakeholders[to].name = stakeholders[from].name;
      stakeholders[to].allocated = stakeholders[from].allocated;
      stakeholders[to].released = stakeholders[from].released;
      stakeholders[to].distributed = stakeholders[from].distributed;
      stakeholders[to].releasePerBlock = stakeholders[from].releasePerBlock;
      stakeholders[to].endBlock = stakeholders[from].endBlock;
      stakeholders[to].lastUpdate = stakeholders[from].lastUpdate;
      _resetStakeholder(from);
      emit MigrateStakeholder(from, to);
    }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function initialize(address token_) public {
      __DistributionVault_init(token_);
    }

    function __DistributionVault_init(address token_) internal initializer {
      __AccessControlPausableUpgradeable_init();
      __DistributionVault_init_unchained(token_);
    }

    // Initialize staking contract
    function __DistributionVault_init_unchained(address token_) internal initializer {
      token = token_;
    }
}
