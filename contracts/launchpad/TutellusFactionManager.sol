// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '../utils/UUPSUpgradeableByRole.sol';
import '../interfaces/ITutellusLaunchpadStaking.sol';

contract TutellusFactionManager is UUPSUpgradeableByRole {

    bytes32 public constant FACTIONS_ADMIN_ROLE = keccak256('FACTIONS_ADMIN_ROLE');

    struct Faction {
        address stakingContract;
        address farmingContract;
    }

    mapping(bytes32=>Faction) public faction;
    mapping(address=>bytes32) public factionOf;
    mapping(address=>address) public authorized;

    modifier isAuthorized (address account) {
        require(msg.sender == account || authorized[account] == msg.sender, 'TutellusFactionManager: account not authorized');
        _;
    }

    modifier checkFaction (bytes32 id, address account) {
        if (factionOf[account] == 0x00) {
            factionOf[account] = id;
            _;
        } else {
            require(factionOf[account] == id, 'TutellusFactionManager: cant stake in multiple factions');
            _;
        }
    }

    modifier checkAfter (address account) {
        _;
        ITutellusLaunchpadStaking stakingInterface = ITutellusLaunchpadStaking(faction[id].stakingContract);
        ITutellusLaunchpadStaking farmingInterface = ITutellusLaunchpadStaking(faction[id].farmingContract);

        if (stakingInterface.getUserBalance(account) + farmingInterface.getUserBalance(account) == 0) {
            factionOf[account] == 0x00;
        }
    }

    function authorize(address account) public {
        authorized[msg.sender] = account;
    }

    function updateFaction (bytes32 id, address stakingContract, address farmingContract) public onlyRole(FACTIONS_ADMIN_ROLE) {
        factions[id] = Faction(stakingContract, farmingContract);
    }

    function stake (bytes32 id, address account, uint256 amount) public isAuthorized(account) checkFaction(id, account) {
        ITutellusLaunchpadStaking(faction[id].stakingContract).deposit(account, amount);
    }

    function stakeLP (bytes32 id, address account, uint256 amount) public isAuthorized(account) checkFaction(id, account) {
        ITutellusLaunchpadStaking(faction[id].farmingContract).deposit(account, amount);
    }

    function unstake (address account, uint256 amount) public isAuthorized(account) checkAfter(account) {
        uint256 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant unstake');
        ITutellusLaunchpadStaking(faction[id].stakingContract).withdraw(account, amount);
    }

    function unstakeLP (address account, uint256 amount) public isAuthorized(account) checkAfter(account) {
        uint256 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant unstakeLP');
        ITutellusLaunchpadStaking(faction[id].farmingContract).withdraw(account, amount);
    }

    function migrateFaction (address account, bytes32 to) public isAuthorized(account) {
        uint256 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant migrate');
        require(faction[to].stakingContract != address(0) && faction[to].farmingContract != address(0), 'TutellusFactionManager: faction does not exist');

        ITutellusLaunchpadStaking stakingInterface = ITutellusLaunchpadStaking(faction[id].stakingContract);
        ITutellusLaunchpadStaking farmingInterface = ITutellusLaunchpadStaking(faction[id].farmingContract);

        uint256 stakingBalance = stakingInterface.getUserBalance(account);
        uint256 farmingBalance = farmingInterface.getUserBalance(account);

        if (stakingBalance > 0) {
            ITutellusLaunchpadStaking(faction[to].stakingContract).deposit(
                account,
                stakingInterface.withdraw(account, stakingBalance)
            );
        }

        if (farmingBalance > 0) {
            ITutellusLaunchpadStaking(faction[to].farmingContract).deposit(
                account,
                farmingInterface.withdraw(account, farmingBalance)
            );
        }

        factionOf[account] = to;
    }
}