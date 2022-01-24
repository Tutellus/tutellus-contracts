// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../utils/TutellusERC20.sol";
import "../TutellusRoleManager.sol";
import "../TutellusHoldersVault.sol";
import "../TutellusRewardsVault.sol";
import "../TutellusClientsVault.sol";
import "../TutellusTreasuryVault.sol";

contract TutellusDeployer {

    address public token;
    address public rolemanager;
    address public treasury;
    address public holdersVault;
    address public teamVault;
    address public rewardsVault;
    address public clientsVault;
    address public treasuryVault;

    constructor(address treasury_, uint startBlock) {
        treasury = treasury_;
        rolemanager = address(new TutellusRoleManager());
        token = address(new TutellusERC20('Tutellus token', 'TUT', 2e26, rolemanager));
        holdersVault = address(new TutellusHoldersVault(rolemanager, token, 10000000e18, startBlock, startBlock + 10519200)); //
        teamVault = address(new TutellusHoldersVault(rolemanager, token, 6000000e18, startBlock + 10519200, startBlock + 27612900));
        rewardsVault = address(new TutellusRewardsVault(rolemanager, token, 64000000e18, startBlock, startBlock + 47336400)); // 47336400 = 3 años
        clientsVault = address(new TutellusClientsVault(rolemanager, token));
        treasuryVault = address(new TutellusTreasuryVault(rolemanager, treasury, token, 29600000e18, startBlock, startBlock + 78894000)); // 78894000 = 5 años

        TutellusRoleManager rolemanagerInstance = TutellusRoleManager(rolemanager);
        rolemanagerInstance.grantMinterRole(address(this));
        rolemanagerInstance.grantMinterRole(holdersVault);
        rolemanagerInstance.grantMinterRole(teamVault);
        
        TutellusERC20 tokenInstance = TutellusERC20(token);
        tokenInstance.mint(treasury, 400000e18);
        tokenInstance.mint(rewardsVault, 64000000e18);
        tokenInstance.mint(clientsVault, 90000000e18);
        tokenInstance.mint(treasuryVault, 29600000e18);

        // treasury = treasury_;
        // rolemanager = address(new TutellusRoleManager());
        // token = address(new TutellusERC20('Tutellus Token', 'TUT', 2e26, rolemanager));
        // holdersVault = address(new TutellusHoldersVault(rolemanager, token, 10000000e18, startBlock, startBlock + 8)); //
        // teamVault = address(new TutellusHoldersVault(rolemanager, token, 6000000e18, startBlock + 8, startBlock + 21));
        // rewardsVault = address(new TutellusRewardsVault(rolemanager, token, 64000000e18, startBlock, startBlock + 36)); // 47336400 = 3 años
        // clientsVault = address(new TutellusClientsVault(rolemanager, token));
        // treasuryVault = address(new TutellusTreasuryVault(rolemanager, treasury, token, 29600000e18, startBlock, startBlock + 60)); // 78894000 = 5 años

        // TutellusRoleManager rolemanagerInstance = TutellusRoleManager(rolemanager);
        // rolemanagerInstance.grantMinterRole(address(this));
        // rolemanagerInstance.grantMinterRole(holdersVault);
        // rolemanagerInstance.grantMinterRole(teamVault);
        
        // TutellusERC20 tokenInstance = TutellusERC20(token);
        // tokenInstance.mint(treasury, 400000e18);
        // tokenInstance.mint(rewardsVault, 64000000e18);
        // tokenInstance.mint(clientsVault, 90000000e18);
        // tokenInstance.mint(treasuryVault, 29600000e18);
    }
}