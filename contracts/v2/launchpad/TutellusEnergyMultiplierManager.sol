// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "contracts/utils/UUPSUpgradeableByRole.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "contracts/interfaces/ITutellusManager.sol";
import "contracts/interfaces/ITutellusLaunchpadStaking.sol";
import "contracts/interfaces/ITutellusEnergyMultiplierManager.sol";

contract TutellusEnergyMultiplierManager is
    ITutellusEnergyMultiplierManager,
    UUPSUpgradeableByRole
{
    bytes32 public constant ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE =
        keccak256("ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE");

    mapping(address => uint8) private _multiplierType;
    mapping(uint8 => uint256) private _factorByType;

    constructor() {
        _disableInitializers();
    }

    /// @inheritdoc ITutellusEnergyMultiplierManager
    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        _factorByType[1] = 1 ether;
        _factorByType[2] = uint256(7 ether) / 3;
    }

    /// @inheritdoc ITutellusEnergyMultiplierManager
    function getEnergyMultiplier(address _contract)
        public
        view
        returns (uint256)
    {
        return _getEnergyMultiplier(_contract);
    }

    /// @inheritdoc ITutellusEnergyMultiplierManager
    function setMultiplierType(address _contract, uint8 _type)
        public
        onlyRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE)
    {
        _multiplierType[_contract] = _type;
        emit SetMultiplierType(_contract, _type);
    }

    /// @inheritdoc ITutellusEnergyMultiplierManager
    function setFactoryByType(uint256 factor, uint8 _type)
        public
        onlyRole(ENERGY_MULTIPLIER_MANAGER_ADMIN_ROLE)
    {
        _factorByType[_type] = factor;
        emit SetFactor(factor, _type);
    }

    function _getEnergyMultiplier(address _contract)
        internal
        view
        returns (uint256 multiplier)
    {
        if (_multiplierType[_contract] == 1) {
            multiplier = (_getMultiplierStaking() * _factorByType[1]) / 1 ether;
        } else if (_multiplierType[_contract] == 2) {
            multiplier =
                (_getEnergyMultiplierFarming(_contract) * _factorByType[2]) /
                1 ether;
        }
    }

    function _getMultiplierStaking() internal pure returns (uint256) {
        return 1 ether;
    }

    function _getEnergyMultiplierFarming(address _contract)
        internal
        view
        returns (uint256)
    {
        address tut = ITutellusManager(config).get(keccak256("ERC20"));
        address token = ITutellusLaunchpadStaking(_contract).token();
        IUniswapV2Pair pair = IUniswapV2Pair(token);
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        address token0 = pair.token0();
        uint256 tutReserves = token0 == tut ? reserve0 : reserve1;
        uint256 tutValue = tutReserves * 2;
        uint256 totalSupply = pair.totalSupply();
        return (tutValue * 1 ether) / totalSupply;
    }
}
