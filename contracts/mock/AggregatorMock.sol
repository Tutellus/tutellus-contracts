// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AggregatorMock is AggregatorV3Interface, Initializable {
    uint80 private _round = 0;
    uint256 private _time = 0;
    string private _description = "mock";
    uint8 private _decimals;
    int256 private _answer;

    function initialize(uint8 decimals_, int256 answer) public {
        __AggregatorMock_init(decimals_, answer);
    }

    function __AggregatorMock_init(uint8 decimals_, int256 answer) internal initializer {
        _decimals = decimals_;
        _answer = answer;
    }

    function decimals() override external view returns (uint8){
        return _decimals;
    }

    function description() override external view returns (string memory){
      return _description;
    }

    function version() override external view returns (uint256){
      return _time;
    }

    function latestRoundData() override external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound){
      return (
        _round,
        _answer,
        _time,
        _time,
        _round
      );
    }

    function getRoundData(uint80 _roundId) override external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound){
      return (
        _roundId,
        _answer,
        _time,
        _time,
        _round
      );
    }

}
