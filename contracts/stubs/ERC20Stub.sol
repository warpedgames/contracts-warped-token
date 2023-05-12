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
import {LenientReentrancyGuard} from "../LenientReentrancyGuard.sol";
import {ITreasuryHandler} from "../interfaces/ITreasuryHandler.sol";

contract ERC20Stub is ERC20, LenientReentrancyGuard {
	constructor(uint256 _totalSupply) ERC20("Test ERC20", "TestToken") {
		_mint(_msgSender(), _totalSupply);
	}

	function testTreausryHandler(
		address treasury,
		address from,
		address to,
		uint256 amount
	) external nonReentrant {
		ITreasuryHandler handler = ITreasuryHandler(treasury);
		handler.processTreasury(from, to, amount);
	}
}
