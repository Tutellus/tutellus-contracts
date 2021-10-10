// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/TutellusERC20.sol";
import "./TutellusRoleManager.sol";
import "./TutellusDistributionVault.sol";
import "./TutellusYFRewardsVault.sol";
import "./TutellusMerkleDistributorUpdateable.sol";
import "./TutellusTreasuryVault.sol";

contract TutellusDeployer {

    address public token;
    address public rolemanager;
    address public treasury;
    address public holdersVault;
    address public farmingVault;
    address public rewardsVault;
    address public treasuryVault;

    constructor(address treasury_) {
        treasury = treasury_;
        rolemanager = address(new TutellusRoleManager(msg.sender));
        token = address(new TutellusERC20('Tutellus Token', 'TUT', 2e26, rolemanager));
        holdersVault = address(new TutellusDistributionVault(rolemanager, token, 16000000e18));
        farmingVault = address(new TutellusYFRewardsVault(rolemanager, token, 64000000e18, 47336400));
        rewardsVault = address(new TutellusMerkleDistributorUpdateable(rolemanager, token));
        treasuryVault = address(new TutellusTreasuryVault(rolemanager, treasury, token, 29600000e18, 78894000));

        TutellusRoleManager rolemanagerInstance = TutellusRoleManager(rolemanager);
        rolemanagerInstance.grantRole(keccak256("MINTER_ROLE"), address(this));
        rolemanagerInstance.grantRole(keccak256("MINTER_ROLE"), holdersVault);
        
        TutellusERC20 tokenInstance = TutellusERC20(token);
        tokenInstance.mint(treasury, 400000e18);
        tokenInstance.mint(farmingVault, 64000000e18);
        tokenInstance.mint(rewardsVault, 90000000e18);
        tokenInstance.mint(treasuryVault, 29600000e18);

        // after deployment:
        //      1. deploy staking and farming
        //      2. add staking and farming to the farmingVault
        //      3. add holders to the holdersVault

    }
}