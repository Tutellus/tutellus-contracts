// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '../libraries/math/MathUtils.sol';

contract ERC20VariableUpgradeable is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable {
    
    using WadRayMath for uint256;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    uint256 public rate;
    uint40 public lastUpdateTimestamp;
    uint256 private _normalization;

    // event Mint(address sender, address account, uint256 amount);
    // event Burn(address sender, address account, uint256 amount);

    event MintVariable(address sender, address account, uint256 amount);
    event BurnVariable(address sender, address account, uint256 amount);
    event Init(uint256 rate, uint256 normalization, uint256 lastUpdateTimestamp);

    function __ERC20Variable_init(string memory name_, string memory symbol_, uint256 rate_) internal onlyInitializing {
        __ERC20Variable_init_unchained(name_, symbol_, rate_);
    }

    function __ERC20Variable_init_unchained(string memory name_, string memory symbol_, uint256 rate_) internal onlyInitializing {
        _name = name_;
        _symbol = symbol_;
        rate = rate_;

        _normalization = WadRayMath.ray();
        lastUpdateTimestamp = uint40(block.timestamp);
        emit Init(rate, _normalization, lastUpdateTimestamp);
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function scale(uint256 amount) public view returns (uint256) {
      return _scaleTo(amount, _getNormalization());
    }

    function unscale(uint256 amount) public view returns (uint256) {
      return _unscaleTo(amount, _getNormalization());
    }

    function _scaleTo(uint256 amount, uint256 normalization) internal pure returns (uint256) {
        return amount.rayDiv(normalization);
    }

    function _unscaleTo(uint256 amount, uint256 normalization) internal pure returns (uint256) {
        return amount.rayMul(normalization);
    }

    function _getNormalization() internal view returns (uint256) {
      uint40 timestamp = lastUpdateTimestamp;

      if (timestamp == uint40(block.timestamp)) {
        return _normalization;
      }

    //   return MathUtils.calculateCompoundedInterest(rate, timestamp).rayMul(_normalization);
      return MathUtils.calculateLinearInterest(rate, timestamp).rayMul(_normalization);
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
      uint256 scaledBalance = scaledBalanceOf(account);

      if (scaledBalance == 0) {
        return 0;
      }

      return unscale(scaledBalance);
    }

    function scaledBalanceOf(address account) public view virtual returns (uint256) {
      return _balances[account];
    }

    function totalSupply() public view virtual override returns (uint256) {
      uint256 scaledSupply = scaledTotalSupply();

      if (scaledSupply == 0) {
        return 0;
      }

      return unscale(scaledSupply);
    }

    function scaledTotalSupply() public view virtual returns (uint256) {
      return _totalSupply;
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `amount` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `amount`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, _allowances[owner][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = _allowances[owner][spender];
        require(currentAllowance >= subtractedValue, "ERC20VariableUpgradeable: decreased allowance below zero");
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `from` must have a balance of at least `amount`.
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20VariableUpgradeable: transfer from the zero address");
        require(to != address(0), "ERC20VariableUpgradeable: transfer to the zero address");

        _beforeTokenTransfer(from, to, amount);

        uint256 amountScaled = scale(amount);

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amountScaled, "ERC20VariableUpgradeable: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amountScaled;
        }
        _balances[to] += amountScaled;

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20VariableUpgradeable: mint to the zero address");
        _beforeTokenTransfer(address(0), account, amount);

        uint256 amountScaled = scale(amount);
        require(amountScaled != 0, 'Cant mint 0 tokens');

        _totalSupply += amountScaled;
        _balances[account] += amountScaled;
        emit Transfer(address(0), account, amount);
        // emit Mint(msg.sender, account, amount);
        emit MintVariable(msg.sender, account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20VariableUpgradeable: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 amountScaled = scale(amount);
        require(amountScaled != 0, 'Cant burn 0 tokens');

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amountScaled, "ERC20VariableUpgradeable: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amountScaled;
        }
        _totalSupply -= amountScaled;

        emit Transfer(account, address(0), amount);
        // emit Burn(msg.sender, account, amount);
        emit BurnVariable(msg.sender, account, amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20VariableUpgradeable: approve from the zero address");
        require(spender != address(0), "ERC20VariableUpgradeable: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Spend `amount` form the allowance of `owner` toward `spender`.
     *
     * Does not update the allowance amount in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Might emit an {Approval} event.
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20VariableUpgradeable: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * has been transferred to `to`.
     * - when `from` is zero, `amount` tokens have been minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function _setRate(uint256 newRate) internal {
      _normalization = _getNormalization();
      lastUpdateTimestamp = uint40(block.timestamp);
      rate = newRate;
    }

    /**
     * This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[45] private __gap;
}
