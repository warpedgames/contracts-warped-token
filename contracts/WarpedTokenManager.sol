// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./WarpedToken.sol";
import "./WarpedTaxHandler.sol";
import "./WarpedTreasuryHandler.sol";
import "./WarpedPoolManager.sol";

/**
 * @title WARPED token manager.
 * @dev Migrate starl old token into new token.
 */
contract WarpedTokenManager is WarpedPoolManager {
    
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    /// @notice STARL token
    IERC20  public starlToken;
    /// @notice WARPED token
    IERC20  public warpedToken;
    /// @dev root hash of merkle tree that snapshots old token holders' addresses and their balances
    bytes32 private merkleRoot;
    /// @notice flag whether swap is open or not
    bool    public swapOpened;
    /// @notice swap start timestamp
    uint256 public swapStartTime;
    /// @notice swap ratio based on total supply of old and new token
    uint256 public swapRatio;
    /// @notice mapping user address and amount of swapped tokens
    mapping (address => uint256) public swappedPerUser;
    /// @notice uniswap v2 router address
    IUniswapV2Router02 public constant uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    event SwapOpened(IERC20 tokenFrom, IERC20 tokenTo, uint256 startTime);
    event SwapClosed(IERC20 tokenFrom, IERC20 tokenTo);
    event Swapped(address from, uint256 amount);

    /// @notice constructor of WARPED token manager
    /// @dev Create TaxHandler, TreasuryHandler, new Token contract, and open swap
    /// @param _starlToken old token contract
    /// @param _merkleRoot root hash of merkle tree that snapshots old token holders' addresses and balances
    /// @param gameRewardVault game reward vault address to be passed
    /// @param warpedTreasury DAO reward vault address to be passed
    /// @param treasuryAddress final tax treasury address
    /// @param _swapStartTime timestamp of swap start time
    /// @param nftContracts array of addresses of NFT contracts to calculate tax rate
    /// @param nftLevels array of levels of NFT contracts to calculate tax rate
    constructor(
        IERC20 _starlToken,
        bytes32 _merkleRoot,
        address gameRewardVault,
        address warpedTreasury,
        address treasuryAddress,
        uint256 _swapStartTime,
        address[] memory nftContracts,
        uint8[] memory nftLevels
    ) {
        starlToken = _starlToken;
        merkleRoot = _merkleRoot;

        // 1. Create treasury and tax Handler
        WarpedTreasuryHandler treasuryHandler = new WarpedTreasuryHandler(IPoolManager(this));
        WarpedTaxHandler taxHandler = new WarpedTaxHandler(IPoolManager(this), nftContracts, nftLevels);

        // 2. Create token contract and initilize treasury handler
        warpedToken = new WarpedToken(address(taxHandler), address(treasuryHandler), gameRewardVault, warpedTreasury);
        // Initialize treasury handler with created token contract
        treasuryHandler.initialize(treasuryAddress, address(warpedToken));

        // 3. Transfer ownership of tax and transfer handlers into msgSender
        taxHandler.transferOwnership(_msgSender());
        treasuryHandler.transferOwnership(_msgSender());
        
        // 4. Open swap
        swapRatio = starlToken.totalSupply() / warpedToken.totalSupply();
        swapOpened = true;
        swapStartTime = _swapStartTime;
        emit SwapOpened(starlToken, warpedToken, _swapStartTime);
    }

    /// @notice ownable function to create and add liquidity
    /// @param amountToLiquidity amount of new tokens to add into liquidity
    function addLiquidity(uint256 amountToLiquidity) external payable onlyOwner {
        require(amountToLiquidity <= warpedToken.balanceOf(address(this)), "Amount exceed balance");

        warpedToken.approve(address(uniswapV2Router), amountToLiquidity);
        address uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(address(warpedToken), uniswapV2Router.WETH());
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(address(warpedToken), amountToLiquidity, 0, 0, owner(), block.timestamp);
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
        
        _exchangePools.add(address(uniswapV2Pair));
        primaryPool = address(uniswapV2Pair);
    }

    /// @notice close swap
    function closeSwap() external onlyOwner {
        require(swapOpened, "Swap not opened");
        swapOpened = false;

        emit SwapClosed(starlToken, warpedToken);
    }

    /// @notice swap function for users
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    /// @param _amount amount to swap
    function swap(bytes32[] memory _merkleProof, uint256 _maxAmount, uint256 _amount) external {
        _swap(_merkleProof, _maxAmount, _amount);
    }
    
    /// @notice swap function for users
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    function swapAll(bytes32[] memory _merkleProof, uint256 _maxAmount) external {
        _swap(_merkleProof, _maxAmount, _maxAmount);
    }

    /// @notice withdraw old starl token
    function withdrawAll() external onlyOwner {
        starlToken.safeTransfer(_msgSender(), starlToken.balanceOf(address(this)));
    }

    /// @notice internal swap function
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    /// @param _amount amount to swap
    function _swap(bytes32[] memory _merkleProof, uint256 _maxAmount, uint256 _amount) internal {
        require(swapOpened, "Migration not opened");
        require(block.timestamp >= swapStartTime, "Migration not started");
        
        bytes32 leaf = keccak256(abi.encodePacked(_msgSender(), _maxAmount));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Merkle proof invalid");

        require(_amount + swappedPerUser[_msgSender()] <= _maxAmount, "Exceed max amount");

        starlToken.safeTransferFrom(_msgSender(), address(this), _amount);
        warpedToken.safeTransfer(_msgSender(), _amount / swapRatio);
        swappedPerUser[_msgSender()] += _amount;

        emit Swapped(_msgSender(), _amount);
    }
}