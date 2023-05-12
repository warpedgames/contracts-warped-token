// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title Treasury handler interface
 * @dev Any class that implements this interface can be used for protocol-specific operations pertaining to the treasury.
 */
interface ITreasuryHandler {
	/**
	 * @notice Perform operations before a transfer is executed.
	 * @param benefactor Address of the benefactor.
	 * @param beneficiary Address of the beneficiary.
	 * @param amount Number of tokens in the transfer.
	 */
	function processTreasury(
		address benefactor,
		address beneficiary,
		uint256 amount
	) external;
}
