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

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {ITaxHandler} from "./interfaces/ITaxHandler.sol";
import {IPoolManager} from "./interfaces/IPoolManager.sol";

contract WarpedTaxHandler is ITaxHandler, Ownable {
	/// @notice NFTs to be used to determine user tax level.
	IERC721[] public nftContracts;
	/// @notice Bits representing levels of each NFTs: 1,2,4,8
	mapping(IERC721 => uint8) public nftLevels;

	struct TaxRatePoint {
		uint256 threshold;
		uint256 rate;
	}

	TaxRatePoint[] public taxRates;
	uint256 private basisTaxRate;
	uint256 private maxTaxRate = 400;
	bool private taxDisabled;
	IPoolManager private poolManager;

	/// @notice Constructor of tax handler contract
	/// @param _poolManager exchange pool manager address
	/// @param _nftContracts array of addresses of NFT contracts
	/// @param _levels array of levels of NFT contracts
	constructor(
		IPoolManager _poolManager,
		address[] memory _nftContracts,
		uint8[] memory _levels
	) {
		poolManager = _poolManager;

		_addNFTs(_nftContracts, _levels);
		// init default tax rates
		basisTaxRate = 400;
		taxRates.push(TaxRatePoint(7, 100));
		taxRates.push(TaxRatePoint(5, 200));
		taxRates.push(TaxRatePoint(1, 300));
		taxDisabled = false;
	}

	/**
	 * @notice Get number of tokens to pay as tax.
	 * @dev There is no easy way to differentiate between a user swapping
	 * tokens and a user adding or removing liquidity to the pool. In both
	 * cases tokens are transferred to or from the pool. This is an unfortunate
	 * case where users have to accept being taxed on liquidity additions and
	 * removal. To get around this issue a separate liquidity addition contract
	 * can be deployed. This contract could be exempt from taxes if its
	 * functionality is verified to only add and remove liquidity.
	 * @param benefactor Address of the benefactor.
	 * @param beneficiary Address of the beneficiary.
	 * @param amount Number of tokens in the transfer.
	 * @return taxAmount Number of tokens for tax
	 */
	function getTax(
		address benefactor,
		address beneficiary,
		uint256 amount
	) external view override returns (uint256) {
		if (taxDisabled) {
			return 0;
		}

		// Transactions between regular users (this includes contracts) aren't taxed.
		if (
			!poolManager.isPoolAddress(benefactor) &&
			!poolManager.isPoolAddress(beneficiary)
		) {
			return 0;
		}

		// Transactions between pools aren't taxed.
		if (
			poolManager.isPoolAddress(benefactor) &&
			poolManager.isPoolAddress(beneficiary)
		) {
			return 0;
		}

		uint256 taxRate = 0;
		// If the benefactor is found in the set of exchange pools, then it's a buy transactions, otherwise a sell
		// transactions, because the other use cases have already been checked above.
		if (poolManager.isPoolAddress(benefactor)) {
			taxRate = _getTaxBasisPoints(beneficiary);
		} else {
			taxRate = _getTaxBasisPoints(benefactor);
		}

		return (amount * taxRate) / 10000;
	}

	/**
	 * @notice Reset tax rate points.
	 * @param thresholds of user level.
	 * @param rates of tax per each threshold.
	 * @param _basisTaxRate basis tax rate.
	 *
	 * Requirements:
	 *
	 * - values of `thresholds` must be placed in ascending order.
	 */
	function setTaxRates(
		uint256[] memory thresholds,
		uint256[] memory rates,
		uint256 _basisTaxRate
	) external onlyOwner {
		require(thresholds.length == rates.length, "Invalid level points");
		require(_basisTaxRate > 0, "Invalid base rate");
		require(_basisTaxRate <= maxTaxRate, "Base rate must be <= than max");

		delete taxRates;
		for (uint256 i = 0; i < thresholds.length; i++) {
			require(rates[i] <= maxTaxRate, "Rate must be less than max rate");
			taxRates.push(TaxRatePoint(thresholds[i], rates[i]));
		}
		basisTaxRate = _basisTaxRate;
	}

	/**
	 * @notice Add addresses and their levels of NFTs.
	 * @dev For future NFT launch, allow to add new NFT addresses and levels.
	 * @param contracts NFT contract addresses.
	 * @param levels NFT contract levels to be used for user level calculation.
	 */
	function addNFTs(
		address[] memory contracts,
		uint8[] memory levels
	) external onlyOwner {
		require(contracts.length > 0 && levels.length > 0, "Invalid parameters");
		_addNFTs(contracts, levels);
	}

	/**
	 * @notice Set no tax for special period
	 */
	function pauseTax() external onlyOwner {
		require(!taxDisabled, "Already paused");
		taxDisabled = true;
	}

	/**
	 * @notice Resume tax handling
	 */
	function resumeTax() external onlyOwner {
		require(taxDisabled, "Not paused");
		taxDisabled = false;
	}

	/**
	 * @notice Get percent of tax to pay for the given user.
	 * @dev Basis tax percent will be varied based on user's ownership of NFTs
	 * in the STARL metaverse. There are 3 user levels and user's level will be
	 * determined by bit-or of nft levels he owned.
	 * SATE: 8(4th bit), LM/LMvX: 4(3rd bit), PAL: 2(2nd bit), PN: 1(first bit)
	 * bit-or >= 7 : 1%
	 * bit-or >= 5 : 2%
	 * bit-or >= 1 : 3%
	 * @param user Address of user(buyer/seller address).
	 * @return Number Basis tax percent in 2 decimal.
	 */
	function _getTaxBasisPoints(address user) internal view returns (uint256) {
		uint256 userLevel = 0;
		for (uint256 i = 0; i < nftContracts.length; i++) {
			IERC721 nft = nftContracts[i];
			if (nft.balanceOf(user) > 0) {
				userLevel = userLevel | nftLevels[nftContracts[i]];
			}
		}
		for (uint256 i = 0; i < taxRates.length; i++) {
			if (userLevel >= taxRates[i].threshold) {
				return taxRates[i].rate;
			}
		}
		return basisTaxRate;
	}

	function _addNFTs(
		address[] memory contracts,
		uint8[] memory levels
	) internal {
		require(contracts.length == levels.length, "Invalid parameters");

		for (uint8 i = 0; i < contracts.length; i++) {
			nftContracts.push(IERC721(contracts[i]));
			nftLevels[IERC721(contracts[i])] = levels[i];
		}
	}
}
