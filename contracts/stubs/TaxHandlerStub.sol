// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/ITaxHandler.sol";

contract TaxHandlerStub is ITaxHandler {
    uint256 private _taxAmount;

    function setTestData(uint256 taxAmount) external {
        _taxAmount = taxAmount;
    }

    function getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external view override returns (uint256) {
        return _taxAmount;
    }
}