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

    function _getNormalization() internal view returns (uint256) {
      uint40 timestamp = lastUpdateTimestamp;

      if (timestamp == uint40(block.timestamp)) {
        return _normalization;
      }

      return MathUtils.calculateCompoundedInterest(rate, timestamp).rayMul(_normalization);
    }

    function mint(address account, uint256 amount) external onlyRole(ENERGY_MINTER_ROLE) {
      uint256 amountScaled = amount.rayDiv(_getNormalization());
      require(amountScaled != 0, 'Cant mint 0 tokens');

      _mint(account, amountScaled);

      emit Transfer(address(0), account, amount);
    }

    function burn(address account, uint256 amount) external onlyRole(ENERGY_MINTER_ROLE) {
      uint256 amountScaled = amount.rayDiv(_getNormalization());
      require(amountScaled != 0, 'Cant burn 0 tokens');

      _burn(account, amountScaled);

      emit Transfer(account, address(0), amount);
    }

    function burnAll(address account) external onlyRole(ENERGY_MINTER_ROLE) {
      require(scaledBalanceOf(account) > 0, 'Cant burn 0 tokens');
      _burn(account, scaledBalanceOf(account));
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
      uint256 scaledBalance = scaledBalanceOf(account);

      if (scaledBalance == 0) {
        return 0;
      }

      return scaledBalance.rayMul(_getNormalization());
    }

    function scaledBalanceOf(address account) public view virtual returns (uint256) {
      return super.balanceOf(account);
    }

    function totalSupply() public view virtual override returns (uint256) {
      uint256 scaledSupply = scaledTotalSupply();

      if (scaledSupply == 0) {
        return 0;
      }

      return
        scaledSupply.rayMul(_getNormalization());
    }

    function scaledTotalSupply() public view virtual returns (uint256) {
      return super.totalSupply();
    }
  }
