// SPDX-License-Identifier: MIT

/**
 __      __  _____ _______________________________________   
/  \    /  \/  _  \\______   \______   \_   _____/\______ \  
\   \/\/   /  /_\  \|       _/|     ___/|    __)_  |    |  \ 
 \        /    |    \    |   \|    |    |        \ |    `   \
  \__/\  /\____|__  /____|_  /|____|   /_______  //_______  /
       \/         \/       \/                  \/         \/ 
 */

pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {ITaxHandler} from "./interfaces/ITaxHandler.sol";
import {ITreasuryHandler} from "./interfaces/ITreasuryHandler.sol";
import {LenientReentrancyGuard} from "./LenientReentrancyGuard.sol";

/// @notice WARPED token contract
/// @dev extends standard ERC20 contract
contract WarpedToken is ERC20, LenientReentrancyGuard {
	uint8 private constant DECIMALS = 18;
	uint256 private constant T_TOTAL = 10_000_000_000 * 10 ** DECIMALS;
	string private constant NAME = unicode"WARPED";
	string private constant SYMBOL = unicode"WARPED";

	/// @notice tax handler
	ITaxHandler public taxHandler;
	/// @notice trasury handler
	ITreasuryHandler public treasuryHandler;

	/// @notice constructor of WARPED token contract
	/// @dev initialize with tax, treasury handler, and reward vault address.
	/// @param taxHandlerAddress tax handler contract address
	/// @param treasuryHandlerAddress treasury handler contract address
	constructor(
		address taxHandlerAddress,
		address treasuryHandlerAddress
	) ERC20(NAME, SYMBOL) {
		taxHandler = ITaxHandler(taxHandlerAddress);
		treasuryHandler = ITreasuryHandler(treasuryHandlerAddress);

		_mint(_msgSender(), T_TOTAL);
	}

	/**
	 * @dev See {ERC20-_beforeTokenTransfer}.
	 * forward into beforeTokenTransferHandler function of treasury handler
	 */
	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 amount
	) internal override nonReentrant {
		treasuryHandler.processTreasury(from, to, amount);
	}

	/**
	 * @dev See {ERC20-_afterTokenTransfer}.
	 * calculate tax, reward, and burn amount using tax handler and transfer using _transfer function
	 */
	function _afterTokenTransfer(
		address from,
		address to,
		uint256 amount
	) internal override nonReentrant {
		if (from == address(0x0)) {
			// skip for mint
			return;
		}

		uint256 taxAmount;
		taxAmount = taxHandler.getTax(from, to, amount);
		if (taxAmount > 0) {
			_transfer(to, address(treasuryHandler), taxAmount);
		}
	}
}
