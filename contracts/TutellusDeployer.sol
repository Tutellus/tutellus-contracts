// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./utils/TutellusERC20.sol";
import "./TutellusRoleManager.sol";
import "./TutellusHoldersVault.sol";
import "./TutellusRewardsVault.sol";
import "./TutellusClientsVault.sol";
import "./TutellusTreasuryVault.sol";

contract TutellusDeployer {

    address public token;
    address public rolemanager;
    address public treasury;
    address public holdersVault;
    address public teamVault;
    address public rewardsVault;
    address public clientsVault;
    address public treasuryVault;

    constructor(address treasury_) {
        treasury = treasury_;
        rolemanager = address(new TutellusRoleManager());
        token = address(new TutellusERC20('Tutellus Token', 'TUT', 2e26, rolemanager));
        holdersVault = address(new TutellusHoldersVault(rolemanager, token, 10000000e18, block.number, block.number + 8));
        teamVault = address(new TutellusHoldersVault(rolemanager, token, 6000000e18, block.number + 8, block.number + 21));
        rewardsVault = address(new TutellusRewardsVault(rolemanager, token, 64000000e18, 36)); // 47336400 = 3 años
        clientsVault = address(new TutellusClientsVault(rolemanager, token));
        treasuryVault = address(new TutellusTreasuryVault(rolemanager, treasury, token, 29600000e18, 60 )); // 78894000 = 5 años

        TutellusRoleManager rolemanagerInstance = TutellusRoleManager(rolemanager);
        rolemanagerInstance.grantMinterRole(address(this));
        rolemanagerInstance.grantMinterRole(holdersVault);
        rolemanagerInstance.grantMinterRole(teamVault);
        
        TutellusERC20 tokenInstance = TutellusERC20(token);
        tokenInstance.mint(treasury, 400000e18);
        tokenInstance.mint(rewardsVault, 64000000e18);
        tokenInstance.mint(clientsVault, 90000000e18);
        tokenInstance.mint(treasuryVault, 29600000e18);

        // after deployment:
        //      1. deploy staking and farming
        //      2. add staking and farming to the rewardsVault
        //      3. add holders to the holdersVault

    }
}