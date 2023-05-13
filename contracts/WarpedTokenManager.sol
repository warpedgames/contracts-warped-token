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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {WarpedToken} from "./WarpedToken.sol";
import {WarpedTaxHandler} from "./WarpedTaxHandler.sol";
import {WarpedTreasuryHandler, IUniswapV2Router02} from "./WarpedTreasuryHandler.sol";
import {WarpedPoolManager, EnumerableSet, IPoolManager} from "./WarpedPoolManager.sol";

import {IUniswapV2Factory} from "./interfaces/IUniswapV2Router02.sol";

/**
 * @title WARPED token manager.
 * @dev Manage WARPED token such as creating token and adding liquidity.
 */
contract WarpedTokenManager is WarpedPoolManager {
	using EnumerableSet for EnumerableSet.AddressSet;
	using SafeERC20 for IERC20;

	/// @notice WARPED token
	IERC20 public warpedToken;
	/// @notice uniswap v2 router address
	IUniswapV2Router02 public constant UNISWAP_V2_ROUTER =
		IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

	/// @notice constructor of WARPED token manager
	/// @dev Create TaxHandler, TreasuryHandler, new Token contract, and open swap
	/// @param treasuryAddress final tax treasury address
	/// @param nftContracts array of addresses of NFT contracts to calculate tax rate
	/// @param nftLevels array of levels of NFT contracts to calculate tax rate
	constructor(
		address treasuryAddress,
		address[] memory nftContracts,
		uint8[] memory nftLevels
	) {
		// 1. Create treasury and tax Handler
		WarpedTreasuryHandler treasuryHandler = new WarpedTreasuryHandler(
			IPoolManager(this)
		);
		WarpedTaxHandler taxHandler = new WarpedTaxHandler(
			IPoolManager(this),
			nftContracts,
			nftLevels
		);

		// 2. Create token contract and initilize treasury handler
		warpedToken = new WarpedToken(
			address(taxHandler),
			address(treasuryHandler)
		);
		// Initialize treasury handler with created token contract
		treasuryHandler.initialize(treasuryAddress, address(warpedToken));

		// 3. Transfer ownership of tax and transfer handlers into msgSender
		taxHandler.transferOwnership(_msgSender());
		treasuryHandler.transferOwnership(_msgSender());
	}

	/// @notice ownable function to create and add liquidity
	/// @param amountToLiquidity amount of new tokens to add into liquidity
	function addLiquidity(uint256 amountToLiquidity) external payable onlyOwner {
		require(
			amountToLiquidity <= warpedToken.balanceOf(address(this)),
			"Amount exceed balance"
		);

		warpedToken.approve(address(UNISWAP_V2_ROUTER), amountToLiquidity);
		address uniswapV2Pair = IUniswapV2Factory(UNISWAP_V2_ROUTER.factory())
			.createPair(address(warpedToken), UNISWAP_V2_ROUTER.WETH());
		UNISWAP_V2_ROUTER.addLiquidityETH{value: address(this).balance}(
			address(warpedToken),
			amountToLiquidity,
			0,
			0,
			owner(),
			block.timestamp
		);
		IERC20(uniswapV2Pair).approve(address(UNISWAP_V2_ROUTER), type(uint).max);

		_exchangePools.add(address(uniswapV2Pair));
		primaryPool = address(uniswapV2Pair);
	}
}
