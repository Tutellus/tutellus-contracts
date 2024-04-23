// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "contracts/utils/TutellusERC20.sol";
import "contracts/v1/TutellusRoleManager.sol";
import "contracts/v1/TutellusHoldersVault.sol";
import "contracts/v1/TutellusRewardsVault.sol";
import "contracts/v1/TutellusClientsVault.sol";
import "contracts/v1/TutellusTreasuryVault.sol";

contract TutellusDeployer {
    address public constant ROUTER_ADDR = address(0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008);
    address public constant WBTC = address(0xf2CdF89965953ee3b64EFA3298ead4Fe237BC848);
    uint256 public constant POOL_AMOUNT = 100_000 ether;
    uint256 public constant WBTC_AMOUNT = 3e7;

    address public token;
    address public rolemanager;
    address public treasury;
    address public holdersVault;
    address public teamVault;
    address public rewardsVault;
    address public clientsVault;
    address public treasuryVault;
    address public pair;

    constructor(address treasury_, uint256 startBlock) {
        treasury = treasury_;
        rolemanager = address(new TutellusRoleManager());
        token = address(new TutellusERC20("Tutellus token", "TUT", 2e26, rolemanager));
        holdersVault =
            address(new TutellusHoldersVault(rolemanager, token, 10000000e18, startBlock, startBlock + 10519200)); //
        teamVault = address(
            new TutellusHoldersVault(rolemanager, token, 6000000e18, startBlock + 10519200, startBlock + 27612900)
        );
        rewardsVault =
            address(new TutellusRewardsVault(rolemanager, token, 64000000e18, startBlock, startBlock + 47336400)); // 47336400 = 3 años
        clientsVault = address(new TutellusClientsVault(rolemanager, token));
        treasuryVault = address(
            new TutellusTreasuryVault(rolemanager, treasury, token, 29600000e18, startBlock, startBlock + 78894000)
        ); // 78894000 = 5 años

        TutellusRoleManager rolemanagerInstance = TutellusRoleManager(rolemanager);
        rolemanagerInstance.grantMinterRole(address(this));
        rolemanagerInstance.grantMinterRole(holdersVault);
        rolemanagerInstance.grantMinterRole(teamVault);

        TutellusERC20 tokenInstance = TutellusERC20(token);
        tokenInstance.mint(treasury, 400000e18);
        tokenInstance.mint(rewardsVault, 64000000e18);
        tokenInstance.mint(clientsVault, 90000000e18);
        tokenInstance.mint(address(this), 29600000e18);

        //create pool
        TutellusERC20(WBTC).mint(address(this), WBTC_AMOUNT);
        tokenInstance.approve(ROUTER_ADDR, type(uint256).max);
        TutellusERC20(WBTC).approve(ROUTER_ADDR, type(uint256).max);
        IUniswapV2Router01(ROUTER_ADDR).addLiquidity(
            token, WBTC, POOL_AMOUNT, WBTC_AMOUNT, 0, 0, treasuryVault, block.timestamp
        );
        tokenInstance.transfer(treasuryVault, tokenInstance.balanceOf(address(this)));
        pair = IUniswapV2Factory(IUniswapV2Router01(ROUTER_ADDR).factory()).getPair(token, WBTC);

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

interface IUniswapV2Router01 {
    function factory() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}
