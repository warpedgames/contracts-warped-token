// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./StarlToken.sol";
import "./StarlTaxHandler.sol";
import "./StarlTreasuryHandler.sol";
import "./StarlPoolManager.sol";

/**
 * @title STARL token migrator.
 * @dev Migrate starl old token into new token.
 */
contract StarlMigrator is StarlPoolManager {
    
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    /// @notice STARL old token
    IERC20  public starlV1;
    /// @notice STARL new token
    IERC20  public starlV2;
    /// @dev root hash of merkle tree that snapshots old token holders' addresses and their balances
    bytes32 private merkleRoot;
    /// @notice flag whether migration is open or not
    bool    public migrationOpened;
    /// @notice migration start timestamp
    uint256 public migrationStartTime;
    /// @notice migration ratio based on total supply of old and new token
    uint256 public migrationRatio;
    /// @notice mapping user address and amount of migrated tokens
    mapping (address => uint256) public migratedPerUser;
    /// @notice uniswap v2 router address
    IUniswapV2Router02 public constant uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    event MigrationOpened(IERC20 tokenFrom, IERC20 tokenTo, uint256 startTime);
    event MigrationClosed(IERC20 tokenFrom, IERC20 tokenTo);
    event Migrated(address from, uint256 amount);

    /// @notice constructor of STARL Migrator
    /// @dev Create TaxHandler, TreasuryHandler, new Token contract, and open migration
    /// @param _starlV1 old token contract
    /// @param _merkleRoot root hash of merkle tree that snapshots old token holders' addresses and balances
    /// @param rewardVault initial reward vault address to be passed
    /// @param treasuryAddress final tax treasury address
    /// @param _migrationStartTime timestamp of migration start time
    /// @param nftContracts array of addresses of NFT contracts to calculate tax rate
    /// @param nftLevels array of levels of NFT contracts to calculate tax rate
    constructor(
        IERC20 _starlV1,
        bytes32 _merkleRoot,
        address rewardVault,
        address treasuryAddress,
        uint256 _migrationStartTime,
        address[] memory nftContracts,
        uint8[] memory nftLevels
    ) {
        starlV1 = _starlV1;
        merkleRoot = _merkleRoot;

        // 1. Create treasury and tax Handler
        StarlTreasuryHandler treasuryHandler = new StarlTreasuryHandler(IPoolManager(this));
        StarlTaxHandler taxHandler = new StarlTaxHandler(IPoolManager(this), nftContracts, nftLevels);

        // 2. Create token contract and initilize treasury handler
        starlV2 = new StarlToken(address(taxHandler), address(treasuryHandler), rewardVault);
        // Initialize treasury handler with created token contract
        treasuryHandler.initialize(treasuryAddress, address(starlV2));

        // 3. Transfer ownership of tax and transfer handlers into msgSender
        taxHandler.transferOwnership(_msgSender());
        treasuryHandler.transferOwnership(_msgSender());
        
        // 4. Open migration
        migrationRatio = starlV1.totalSupply() / starlV2.totalSupply();
        migrationOpened = true;
        migrationStartTime = _migrationStartTime;
        emit MigrationOpened(starlV1, starlV2, migrationStartTime);
    }

    /// @notice ownable function to create and add liquidity
    /// @param amountToLiquidity amount of new tokens to add into liquidity
    function addLiquidity(uint256 amountToLiquidity) external payable onlyOwner {
        require(amountToLiquidity <= starlV2.balanceOf(address(this)), "Amount exceed balance");

        starlV2.approve(address(uniswapV2Router), amountToLiquidity);
        address uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(address(starlV2), uniswapV2Router.WETH());
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(address(starlV2), amountToLiquidity, 0, 0, owner(), block.timestamp);
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
        
        _exchangePools.add(address(uniswapV2Pair));
        primaryPool = address(uniswapV2Pair);
    }

    /// @notice close migration
    function closeMigration() external onlyOwner {
        require(migrationOpened, "Migration not opened");
        migrationOpened = false;

        emit MigrationClosed(starlV1, starlV2);
    }

    /// @notice migrate function for users
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    /// @param _amount amount to migrate
    function migrate(bytes32[] memory _merkleProof, uint256 _maxAmount, uint256 _amount) external {
        _migrate(_merkleProof, _maxAmount, _amount);
    }
    
    /// @notice migrate function for users
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    function migrateAll(bytes32[] memory _merkleProof, uint256 _maxAmount) external {
        _migrate(_merkleProof, _maxAmount, _maxAmount);
    }

    /// @notice withdraw old starl token
    function withdrawAll() external onlyOwner {
        starlV1.safeTransfer(_msgSender(), starlV1.balanceOf(address(this)));
    }

    /// @notice internal migrate function
    /// @param _merkleProof of old starl token holder
    /// @param _maxAmount snapshoted balance of old starl token holder
    /// @param _amount amount to migrate
    function _migrate(bytes32[] memory _merkleProof, uint256 _maxAmount, uint256 _amount) internal {
        require(migrationOpened, "Migration not opened");
        require(block.timestamp >= migrationStartTime, "Migration not started");
        
        bytes32 leaf = keccak256(abi.encodePacked(_msgSender(), _maxAmount));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Merkle proof invalid");

        require(_amount + migratedPerUser[_msgSender()] <= _maxAmount, "Exceed max amount");

        starlV1.safeTransferFrom(_msgSender(), address(this), _amount);
        starlV2.safeTransfer(_msgSender(), _amount / migrationRatio);
        migratedPerUser[_msgSender()] += _amount;

        emit Migrated(_msgSender(), _amount);
    }
}