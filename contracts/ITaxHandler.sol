// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITaxHandler {
    /**
     * @notice Get number of tokens to pay as tax.
     * @param benefactor Address of the benefactor.
     * @param beneficiary Address of the beneficiary.
     * @param amount Number of tokens in the transfer.
     * @return Triple (taxAmount, rewardAmount, burnAmount).
     */
    function getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external view returns (uint256, uint256, uint256);
}