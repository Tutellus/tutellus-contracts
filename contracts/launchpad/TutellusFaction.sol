// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '../utils/UUPSUpgradeableByRole.sol';
import './ITutellusEnergy.sol';
import './TutellusLaunchpadStaking.sol';
import '../libraries/math/MathUtils.sol';

/**
 * @title TutellusFaction
 * @notice Manages the energy of the faction
 * @author Tutellus 
 **/

contract TutellusFaction is UUPSUpgradeableByRole {

    using WadRayMath for uint256;

    address public stakingContract;
    address public farmingContract;

    uint256 public scaledSupply;

    mapping(address=>uint256) public scaledStakingBalance;
    mapping(address=>uint256) public scaledFarmingBalance;

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        address token = ITutellusManager(msg.sender).get(keccak256('ERC20'));
        address lptoken = ITutellusManager(msg.sender).get(keccak256('LP'));
        stakingContract = address(new TutellusLaunchpadStaking(token));
        farmingContract = address(new TutellusLaunchpadStaking(lptoken));
        //set fees?
    }

    function depositStaking(address account, uint256 amount) public whenNotPaused {
        
        address energy = ITutellusManager(config).get(keccak256('ENERGY'));
        uint256 scaledAmount = amount.rayDiv(ITutellusEnergy(energy).getNormalization());

        scaledSupply += scaledAmount;
        scaledStakingBalance[account] += scaledAmount;

        TutellusLaunchpadStaking(stakingContract).deposit(account, amount);
        ITutellusEnergy(energy).mint(account, amount);
    }

    function withdrawStaking(address account, uint256 amount) public whenNotPaused {
        
        address energy = ITutellusManager(config).get(keccak256('ENERGY'));
        uint256 scaledAmount = amount.rayDiv(ITutellusEnergy(energy).getNormalization());

        scaledSupply -= scaledAmount;
        scaledBalance[account] -= scaledAmount;

        TutellusLaunchpadStaking(stakingContract).withdraw(account, scaledAmount);
        ITutellusEnergy(energy).burn(account, amount);
    }

    function withdrawAllStaking(address account) public whenNotPaused {
        uint256 balance = TutellusLaunchpadStaking(stakingContract).getUserBalance(account);
        uint256 requiredEnergy = balance.rayMul(ITutellusEnergy(energy).getNormalization());

        TutellusLaunchpadStaking(stakingContract).withdraw(account, balance);
        ITutellusEnergy(energy).burn(account, requiredEnergy);
    }
}