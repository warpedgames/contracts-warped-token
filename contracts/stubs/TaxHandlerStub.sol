// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../ITaxHandler.sol";

contract TaxHandlerStub is ITaxHandler {
    uint256 private _taxAmount;
    uint256 private _rewardAmount;
    uint256 private _burnAmount;

    function setTestData(uint256 taxAmount, uint256 rewardAmount, uint256 burnAmount) external {
        _taxAmount = taxAmount;
        _rewardAmount = rewardAmount;
        _burnAmount = burnAmount;
    }

    function getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external view override returns (uint256, uint256, uint256) {
        return (_taxAmount, _rewardAmount, _burnAmount);
    }
}