// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/ITaxHandler.sol";

contract TaxHandlerStub is ITaxHandler {
    uint256 private _taxAmount;
    uint256 private _gameRewardAmount;
    uint256 private _warpedTreasuryAmount;

    function setTestData(uint256 taxAmount, uint256 gameRewardAmount, uint256 warpedTreasuryAmount) external {
        _taxAmount = taxAmount;
        _gameRewardAmount = gameRewardAmount;
        _warpedTreasuryAmount = warpedTreasuryAmount;
    }

    function getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external view override returns (uint256, uint256, uint256) {
        return (_taxAmount, _gameRewardAmount, _warpedTreasuryAmount);
    }
}