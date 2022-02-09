// Inspired by VariableDebtToken.sol from @aave/protocol-v2
// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '../utils/UUPSUpgradeableByRole.sol';
import '../libraries/math/MathUtils.sol';

/**
 * @title TutellusEnergy
 * @notice Implements a variable energy token
 * @author Tutellus 
 **/

contract TutellusEnergy is ERC20Upgradeable, UUPSUpgradeableByRole {

    using WadRayMath for uint256;

    bytes32 public constant ENERGY_MANAGER_ROLE = keccak256('ENERGY_MANAGER_ROLE');
    bytes32 public constant ENERGY_MINTER_ROLE = keccak256('ENERGY_MINTER_ROLE');

    uint256 public rate;
    uint40 public lastUpdateTimestamp;
    uint256 private _normalization;

    event Mint(address sender, address account, uint256 amount);
    event Burn(address sender, address account, uint256 amount);

    function initialize() public initializer {
      __ERC20_init_unchained('Tutellus Energy Token', 'TET');
      __AccessControlProxyPausable_init(msg.sender);
      
      lastUpdateTimestamp = uint40(block.timestamp);
      _normalization = WadRayMath.ray();
      rate = WadRayMath.ray();
    }

    function setRate(uint256 newRate) public onlyRole(ENERGY_MANAGER_ROLE) {
      _normalization = _getNormalization();
      lastUpdateTimestamp = uint40(block.timestamp);
      rate = newRate;
    }

    function scale(uint256 amount) public view returns (uint256) {
      return amount.rayDiv(_getNormalization());
    }

    function unscale(uint256 amount) public view returns (uint256) {
      return amount.rayMul(_getNormalization());
    } 

    function _getNormalization() internal view returns (uint256) {
      uint40 timestamp = lastUpdateTimestamp;

      if (timestamp == uint40(block.timestamp)) {
        return _normalization;
      }

      return MathUtils.calculateCompoundedInterest(rate, timestamp).rayMul(_normalization);
    }

    function mint(address account, uint256 amount) external onlyRole(ENERGY_MINTER_ROLE) {
      uint256 amountScaled = scale(amount);
      require(amountScaled != 0, 'Cant mint 0 tokens');

      _mint(account, amountScaled);

      emit Mint(msg.sender, account, amount);
    }

    function burn(address account, uint256 amount) external onlyRole(ENERGY_MINTER_ROLE) {
      uint256 amountScaled = scale(amount);
      require(amountScaled != 0, 'Cant burn 0 tokens');

      _burn(account, amountScaled);

      emit Burn(msg.sender, account, amount);
    }

    function burnAll(address account) external onlyRole(ENERGY_MINTER_ROLE) {
      uint256 amount = scaledBalanceOf(account);
      require(amount > 0, 'Cant burn 0 tokens');
      _burn(account, amount);

      emit Burn(msg.sender, account, amount);
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
      uint256 scaledBalance = scaledBalanceOf(account);

      if (scaledBalance == 0) {
        return 0;
      }

      return unscale(scaledBalance);
    }

    function scaledBalanceOf(address account) public view virtual returns (uint256) {
      return super.balanceOf(account);
    }

    function totalSupply() public view virtual override returns (uint256) {
      uint256 scaledSupply = scaledTotalSupply();

      if (scaledSupply == 0) {
        return 0;
      }

      return unscale(scaledSupply);
    }

    function scaledTotalSupply() public view virtual returns (uint256) {
      return super.totalSupply();
    }
  }
