// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IERC20.sol";
import "../interfaces/IPancakeFactory.sol";

contract PancakeRouterMock {

  address public factory;

  constructor(){
    PancakeFactoryMock factory_ = new PancakeFactoryMock();
    factory = address(factory_);
  }

  function createPair(address tokenA, address tokenB) public returns(address) {
    IPancakeFactory factoryInterface = IPancakeFactory(factory);
    address pair = factoryInterface.getPair(tokenA, tokenB);
    if(pair == address(0)){
      pair = factoryInterface.createPair(tokenA, tokenB);
    }
    return pair;
  }
  function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) public returns(address) {
    address pair = createPair(tokenA, tokenB);
    IERC20 tokenInterfaceA = IERC20(tokenA);
    IERC20 tokenInterfaceB = IERC20(tokenB);
    require(tokenInterfaceA.allowance(msg.sender, address(this)) >= amountA, "PancakeRouterMock: contract needs allowance to manage the token");
    require(tokenInterfaceB.allowance(msg.sender, address(this)) >= amountB, "PancakeRouterMock: contract needs allowance to manage the token");
    require(tokenInterfaceA.transferFrom(msg.sender, pair, amountA), "PancakeRouterMock: transfer failed");
    require(tokenInterfaceB.transferFrom(msg.sender, pair, amountB), "PancakeRouterMock: transfer failed");
    return pair;
  }
}

contract PancakeFactoryMock {

  mapping(address => mapping(address => address)) public getPair;

  function createPair(address tokenA, address tokenB) public returns (address){
    require(tokenA != tokenB, "Pancake: IDENTICAL_ADDRESSES");
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), "Pancake: ZERO_ADDRESS");
    require(getPair[token0][token1] == address(0), "Pancake: PAIR_EXISTS"); // single check is sufficient
    PancakePairMock pair = new PancakePairMock(tokenA, tokenB);
    address pairAddress = address(pair);
    getPair[token0][token1] = pairAddress;
    getPair[token1][token0] = pairAddress;
    return pairAddress;
  }
}

contract PancakePairMock {
  address public tokenA;
  address public tokenB;

  constructor(address tokenA_, address tokenB_){
    tokenA = tokenA_;
    tokenB = tokenB_;
  }

  function reservesA() public view returns (uint256){
    IERC20 tokenInterface = IERC20(tokenA);
    return tokenInterface.balanceOf(address(this));
  }
  function reservesB() public view returns (uint256){
    IERC20 tokenInterface = IERC20(tokenB);
    return tokenInterface.balanceOf(address(this));
  }
}
