// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '../utils/UUPSUpgradeableByRole.sol';
import '../interfaces/ITutellusLaunchpadStaking.sol';
import '../interfaces/ITutellusFactionManager.sol';

contract TutellusFactionManager is ITutellusFactionManager, UUPSUpgradeableByRole {

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
            emit FactionIn(id, account);
        } else {
            require(factionOf[account] == id, 'TutellusFactionManager: cant stake in multiple factions');
            _;
        }
    }

    modifier checkAfter (address account) {
        _;
        bytes32 id = factionOf[account];
        ITutellusLaunchpadStaking stakingInterface = ITutellusLaunchpadStaking(faction[id].stakingContract);
        ITutellusLaunchpadStaking farmingInterface = ITutellusLaunchpadStaking(faction[id].farmingContract);

        if (stakingInterface.getUserBalance(account) + farmingInterface.getUserBalance(account) == 0) {
            factionOf[account] == 0x00;
            emit FactionOut(id, account);
        }
    }

    function authorize(address account) public {
        authorized[msg.sender] = account;
    }

    function updateFaction (bytes32 id, address stakingContract, address farmingContract) public onlyRole(FACTIONS_ADMIN_ROLE) {
        faction[id] = Faction(stakingContract, farmingContract);
    }

    function stake (bytes32 id, address account, uint256 amount) public isAuthorized(account) checkFaction(id, account) {
        ITutellusLaunchpadStaking(faction[id].stakingContract).deposit(account, amount);
        emit Stake(id, account, amount);
    }

    function stakeLP (bytes32 id, address account, uint256 amount) public isAuthorized(account) checkFaction(id, account) {
        ITutellusLaunchpadStaking(faction[id].farmingContract).deposit(account, amount);
        emit StakeLP(id, account, amount);
    }

    function unstake (address account, uint256 amount) public isAuthorized(account) checkAfter(account) {
        bytes32 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant unstake');
        ITutellusLaunchpadStaking(faction[id].stakingContract).withdraw(account, amount);
        emit Unstake(id, account, amount);
    }

    function unstakeLP (address account, uint256 amount) public isAuthorized(account) checkAfter(account) {
        bytes32 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant unstakeLP');
        ITutellusLaunchpadStaking(faction[id].farmingContract).withdraw(account, amount);
        emit UnstakeLP(id, account, amount);
    }

    function migrateFaction (address account, bytes32 to) public isAuthorized(account) {
        bytes32 id = factionOf[account];
        require(id != 0x00, 'TutellusFactionManager: cant migrate');
        require(faction[to].stakingContract != address(0) && faction[to].farmingContract != address(0), 'TutellusFactionManager: faction does not exist');

        ITutellusLaunchpadStaking stakingInterface = ITutellusLaunchpadStaking(faction[id].stakingContract);
        ITutellusLaunchpadStaking farmingInterface = ITutellusLaunchpadStaking(faction[id].farmingContract);

        uint256 stakingBalance = stakingInterface.getUserBalance(account);
        uint256 farmingBalance = farmingInterface.getUserBalance(account);

        if (stakingBalance > 0) {
            uint256 newAmount = stakingInterface.withdraw(account, stakingBalance);
            ITutellusLaunchpadStaking(faction[to].stakingContract).deposit(account, newAmount);
            emit Unstake(id, account, stakingBalance);
            emit Stake(to, account, newAmount);
        }

        if (farmingBalance > 0) {
            uint256 newAmount = farmingInterface.withdraw(account, farmingBalance);
            ITutellusLaunchpadStaking(faction[to].farmingContract).deposit(account, newAmount);
            emit UnstakeLP(id, account, farmingBalance);
            emit StakeLP(to, account, newAmount);
        }

        factionOf[account] = to;
        emit FactionOut(id, account);
        emit FactionIn(to, account);
        emit Migrate(id, to, account);
    }
}