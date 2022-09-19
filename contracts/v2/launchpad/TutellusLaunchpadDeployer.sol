// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusEnergyMultiplierManager.sol";
import "contracts/interfaces/ITutellusFactionManager.sol";
import "contracts/interfaces/ITutellusRewardsVaultV2.sol";

contract TutellusLaunchpadDeployer {
    address public owner;

    constructor(address _owner) {
        owner = owner;
    }
    
    function deploy(
        address managerAddress,
        bytes memory vaultBytecode,
        address energyImplementation,
        address whitelistImplementation,
        address energyMultiplierImplementation,
        address factionManagerImplementation,
        address stakingImplementation,
        address idoFactoryImplementation,
        bytes memory emptyInitializeCalldata,
        bytes memory calldataStaking,
        bytes memory calldataFarming
    ) external {
        require(msg.sender == owner);
        ITutellusManager manager = ITutellusManager(managerAddress);

        manager.deploy(
            keccak256("LAUNCHPAD_REWARDS"),
            vaultBytecode,
            emptyInitializeCalldata
        );
        address vaultAddress = manager.get(keccak256("LAUNCHPAD_REWARDS"));
        manager.deployProxyWithImplementation(
            keccak256("ENERGY"),
            energyImplementation,
            emptyInitializeCalldata
        );
        manager.deployProxyWithImplementation(
            keccak256("WHITELIST"),
            whitelistImplementation,
            emptyInitializeCalldata
        );
        manager.deployProxyWithImplementation(
            keccak256("ENERGY_MULTIPLIER_MANAGER"),
            energyMultiplierImplementation,
            emptyInitializeCalldata
        );
        address energyManagerAddress = manager.get(keccak256("ENERGY_MULTIPLIER_MANAGER"));
        manager.deployProxyWithImplementation(
            keccak256("FACTION_MANAGER"),
            factionManagerImplementation,
            emptyInitializeCalldata
        );
        address factionManagerAddress = manager.get(keccak256("FACTION_MANAGER"));
        manager.deployProxyWithImplementation(
            keccak256("LAUNCHPAD_IDO_FACTORY"),
            idoFactoryImplementation,
            emptyInitializeCalldata
        );
        address factory = manager.get(keccak256("LAUNCHPAD_IDO_FACTORY"));

        //Stakings
        manager.deployProxyWithImplementation(
            keccak256("NAKAMOTOS_STAKING"),
            stakingImplementation,
            calldataStaking
        );
        manager.deployProxyWithImplementation(
            keccak256("VUTERINS_STAKING"),
            stakingImplementation,
            calldataStaking
        );
        manager.deployProxyWithImplementation(
            keccak256("ALTCOINERS_STAKING"),
            stakingImplementation,
            calldataStaking
        );
        manager.deployProxyWithImplementation(
            keccak256("NAKAMOTOS_FARMING"),
            stakingImplementation,
            calldataFarming
        );
        manager.deployProxyWithImplementation(
            keccak256("VUTERINS_FARMING"),
            stakingImplementation,
            calldataFarming
        );
        manager.deployProxyWithImplementation(
            keccak256("ALTCOINERS_FARMING"),
            stakingImplementation,
            calldataFarming
        );
        address staking1 = manager.get(keccak256("NAKAMOTOS_STAKING"));
        address staking2 = manager.get(keccak256("VUTERINS_STAKING"));
        address staking3 = manager.get(keccak256("ALTCOINERS_STAKING"));
        address farming1 = manager.get(keccak256("NAKAMOTOS_FARMING"));
        address farming2 = manager.get(keccak256("VUTERINS_FARMING"));
        address farming3 = manager.get(keccak256("ALTCOINERS_FARMING"));

        //Grant roles
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), staking1);
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), staking2);
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), staking3);
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), farming1);
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), farming2);
        manager.grantRole(keccak256("ENERGY_MINTER_ROLE"), farming3);

        manager.grantRole(keccak256("IDO_ADMIN_ROLE"), factory);
        manager.grantRole(keccak256("ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE"), address(this));
        manager.grantRole(keccak256("FACTIONS_ADMIN_ROLE"), address(this));
        manager.grantRole(keccak256("REWARDS_MANAGER_ROLE"), address(this));

        //Set multiplier types
        ITutellusEnergyMultiplierManager energyManager = ITutellusEnergyMultiplierManager(energyManagerAddress);
        energyManager.setMultiplierType(staking1, 1);
        energyManager.setMultiplierType(staking2, 1);
        energyManager.setMultiplierType(staking3, 1);
        energyManager.setMultiplierType(farming1, 2);
        energyManager.setMultiplierType(farming2, 2);
        energyManager.setMultiplierType(farming3, 2);

        //Update factions
        ITutellusFactionManager factionManager = ITutellusFactionManager(factionManagerAddress);
        factionManager.updateFaction(keccak256("NAKAMOTOS_FACTION"), staking1, farming1);
        factionManager.updateFaction(keccak256("VUTERINS_FACTION"), staking2, farming2);
        factionManager.updateFaction(keccak256("ALTCOINERS_FACTION"), staking3, farming3);

        //Set allocations
        ITutellusRewardsVaultV2 rewardsVault = ITutellusRewardsVaultV2(vaultAddress);
        uint256[] memory array = new uint256[](1);
        array[0] = 100 ether;
        rewardsVault.add(staking1, array);
        array = new uint256[](2);
        array[0] = 100 ether;
        rewardsVault.add(staking2, array);
        array = new uint256[](3);
        array[0] = 100 ether;
        rewardsVault.add(staking3, array);
        array = new uint256[](4);
        array[0] = 100 ether;
        rewardsVault.add(farming1, array);
        array = new uint256[](5);
        array[0] = 100 ether;
        rewardsVault.add(farming2, array);
        array = new uint256[](6);
        array[0] = 100 ether;
        rewardsVault.add(farming3, array);

        uint256[] memory allocations = new uint256[](6);
        allocations[0] = 10 ether;
        allocations[1] = 10 ether;
        allocations[2] = 10 ether;
        allocations[3] = uint256(70 ether) / 3;
        allocations[4] = uint256(70 ether) / 3;
        allocations[5] = (uint256(70 ether) / 3) + 1;
        rewardsVault.setAllocations(allocations);

        manager.renounceRole(0x00, address(this));
    }
}