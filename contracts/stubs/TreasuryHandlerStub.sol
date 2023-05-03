// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITreasuryHandler.sol";

/**
 * @title Treasury handler interface
 * @dev Any class that implements this interface can be used for protocol-specific operations pertaining to the treasury.
 */
contract TreasuryHandlerStub is ITreasuryHandler {

    IERC20 public token;
    address public poolAddress;
    uint256 public calledTime;

    function setTokenAndPool(address _tokenAddress, address _poolAddress) external {
        token = IERC20(_tokenAddress);
        poolAddress = _poolAddress;
    }

    function processTreasury(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external override {
        if (benefactor == address(0x0)) {
            return;
        }
        calledTime = calledTime + 1;
        uint256 tokenBalance = token.balanceOf(address(this));
        uint256 testAmount = amount < tokenBalance ? amount : tokenBalance;
        token.transfer(poolAddress, testAmount/2);
        token.transfer(poolAddress, testAmount/2);
    }
}