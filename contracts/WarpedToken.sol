// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./ITaxHandler.sol";
import "./ITreasuryHandler.sol";
import "./LenientReentrancyGuard.sol";

/// @notice STARL token contract
/// @dev extends standard ERC20 contract
contract WarpedToken is ERC20, LenientReentrancyGuard {
    uint8 private constant      _decimals = 18;
    uint256 private constant    _tTotal = 1_000_000_000 * 10**_decimals;
    string private constant     _name = unicode"WARPED";
    string private constant     _symbol = unicode"WARPED";

    /// @notice tax handler
    ITaxHandler public taxHandler;
    /// @notice trasury handler
    ITreasuryHandler public treasuryHandler;
    /// @notice reward vault
    address public rewardVault;
    /// @notice DAO vault
    address public warpedTreasury;

    /// @notice constructor of STARL token contract
    /// @dev initialize with tax and treasury handler, reward vault and migrator address,
    /// and mint total supply into migrator.
    /// @param taxHandlerAddress tax handler contract address
    /// @param treasuryHandlerAddress treasury handler contract address
    /// @param rewardVaultAddress vault address
    /// @param warpedTreasuryAddress vault address
    constructor (
        address taxHandlerAddress,
        address treasuryHandlerAddress,
        address rewardVaultAddress,
        address warpedTreasuryAddress
    ) ERC20(_name, _symbol) {
        warpedTreasury = warpedTreasuryAddress;
        rewardVault = rewardVaultAddress;
        taxHandler = ITaxHandler(taxHandlerAddress);
        treasuryHandler = ITreasuryHandler(treasuryHandlerAddress);

        _mint(_msgSender(), _tTotal);
    }

    /**
     * @notice update current reward vault
     * Requirements:
     *  msg sender should be current reward vault address
     * @param newAddress new reward vault address
     */
    function updateRewardVault(address newAddress) external {
        require(_msgSender() == rewardVault, "Not allowed");
        require(newAddress != address(0x0), "Null address");
        rewardVault = newAddress;
    }
    
    /**
     * @dev See {ERC20-_beforeTokenTransfer}.
     * forward into beforeTokenTransferHandler function of treasury handler
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override nonReentrant {
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
        uint256 gameRewardAmount;
        uint256 warpedTreasuryAmount;
        (taxAmount, gameRewardAmount, warpedTreasuryAmount) = taxHandler.getTax(from, to, amount);
        if (taxAmount > 0) {
            _transfer(to, address(treasuryHandler), taxAmount);
        }
        if (gameRewardAmount > 0) {
            _transfer(to, rewardVault, gameRewardAmount);
        }
        if (warpedTreasuryAmount > 0) {
            _transfer(to, warpedTreasury, warpedTreasuryAmount);
        }
    }
}