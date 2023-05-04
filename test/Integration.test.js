const { ethers } = require("hardhat");
const { expect } = require('chai');
const {
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const BN = ethers.BigNumber;
const uniswapRouterAbi = require('./abis/uniswapRouterAbi.json');
const mainnetAddresses = require('../addresses/mainnet.json');
const goerliAddresses = require('../addresses/goerli.json');
const { BigNumber } = require("ethers");
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

const getCurrentTime = async () => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    // console.log("block: " + blockNumBefore + " : " + timestampBefore);
    return timestampBefore;
};

describe('Integration Test 1', function () {
    before(async function () {
      this.WarpedTokenManager = await ethers.getContractFactory('WarpedTokenManager');
      this.WarpedToken = await ethers.getContractFactory('WarpedToken');
      this.WarpedTaxHandler = await ethers.getContractFactory('WarpedTaxHandler');
      this.WarpedTreasuryHandler = await ethers.getContractFactory('WarpedTreasuryHandler');
      this.ERC721 = await ethers.getContractFactory('ERC721Stub');
      const [owner, user, tester, pool, gameVault, warpedTreasury, taxWallet] = await ethers.getSigners();
      this.owner = owner;
      this.user = user;
      this.tester = tester;
      this.pool = pool;
      this.gameVault = gameVault;
      this.warpedTreasury = warpedTreasury;
      this.taxWallet = taxWallet;
    });

    beforeEach(async function() {
        await this.taxWallet.sendTransaction({value: ethers.utils.parseEther("1000"), to: this.owner.address});
        this.sateNft = await this.ERC721.deploy();
        this.lmvxNft = await this.ERC721.deploy();
        this.palNft = await this.ERC721.deploy();
        this.pnNft = await this.ERC721.deploy();
        this.otherNft1 = await this.ERC721.deploy();
        this.otherNft2 = await this.ERC721.deploy();
        await this.sateNft.deployed();
        await this.lmvxNft.deployed();
        await this.palNft.deployed();
        await this.otherNft1.deployed();
        await this.otherNft2.deployed();

        const nftContracts = [this.sateNft.address, this.lmvxNft.address, this.palNft.address, this.pnNft.address];
        const nftLevels = [8, 4, 2, 1];
        
        this.manager = await this.WarpedTokenManager.deploy(
            this.gameVault.address,
            this.warpedTreasury.address,
            this.taxWallet.address,
            nftContracts,
            nftLevels
        );
        await this.manager.deployed();

        this.token = await this.WarpedToken.attach(await this.manager.warpedToken());
        this.treasuryHandler = await this.WarpedTreasuryHandler.attach(await this.token.treasuryHandler());
        this.taxHandler = await this.WarpedTaxHandler.attach(await this.token.taxHandler());

        const tokenToLiquidity = ethers.utils.parseEther("500000000");
        const ethToLiquidity = ethers.utils.parseEther("1000");
        await this.manager.addLiquidity(tokenToLiquidity, {
            value: ethToLiquidity
        });

        this.router = await ethers.getContractAt(uniswapRouterAbi, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
        this.wethAddress = await this.router.WETH();
    });

    it(".01 ETH buy - no NFTs - Expected Result: 4% tax - 3% to team wallet / 1% to game reward vault", async function() {
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 100, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        console.log("total amount ", totalAmount);
        expect(taxAmount).to.equal(totalAmount.mul(3).div(100));
        expect(rewardAmount).to.equal(totalAmount.mul(1).div(100));
    });

    it(".01 ETH sell - no NFTs - Expected Result: 4% tax - 3% to team wallet / 1% to warped treasury / 20% of tax to liquidity vault", async function() {
        // Buy token for 0.01 eth 
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});

        const tokenToSell = ethers.utils.parseEther("4000");
        const _router = this.router.connect(this.user);
        const _token = this.token.connect(this.user);
        await _token.approve(_router.address, tokenToSell);  
        const _curBalance = await _token.balanceOf(this.treasuryHandler.address);
        await _router.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenToSell, 0, [this.token.address, this.wethAddress], this.user.address, curTime + 100);
        expect(await _token.balanceOf(this.treasuryHandler.address)).to.equal(_curBalance.add(tokenToSell.mul(3).div(100)));
        const rewardAmount = await this.token.balanceOf(this.warpedTreasury.address);
        expect(rewardAmount).to.equal(tokenToSell.mul(1).div(100));
    });

    it(".01 ETH buy/sell - 1 PAL - Expected Result: 3% tax", async function() {
        // mint pal to user
        await this.palNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});

        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(30000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 3% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward

        const tokenToSell = ethers.utils.parseEther("4000");
        const _router = this.router.connect(this.user);
        const _token = this.token.connect(this.user);
        await _token.approve(_router.address, tokenToSell);  
        await _router.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenToSell, 0, [this.token.address, this.wethAddress], this.user.address, curTime + 100);
        const taxAmount2 = await this.token.balanceOf(this.treasuryHandler.address);
        expect(taxAmount.add(tokenToSell.mul(3).div(100))).to.closeTo(taxAmount2, BN.from(1));
        expect(await this.token.balanceOf(this.gameVault.address)).to.equal(BN.from(0));
        expect(await this.token.balanceOf(this.warpedTreasury.address)).to.equal(BN.from(0));
    });

    it(".01 ETH buy/sell - 1 PN - Expected Result: 3% tax", async function() {
        // mint pal to user
        await this.pnNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(30000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 3% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward
    });

    it(".01 ETH buy/sell - 1 LMvX - Expected Result: 3% tax", async function() {
        // mint pal to user
        await this.lmvxNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(30000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 3% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward
    });

    it(".01 ETH buy/sell - 1 LM / 1 PN - Expected Result: 2% tax", async function() {
        // mint pal to user
        await this.lmvxNft.mint(this.user.address);
        await this.pnNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(20000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 2% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward
    });

    it(".01 ETH buy/sell - 1 LM / 1 PAL - Expected Result: 2% tax", async function() {
        // mint pal to user
        await this.lmvxNft.mint(this.user.address);
        await this.pnNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(20000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 2% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward
    });

    it(".01 ETH buy/sell - 1 LM / 1 PAL / 1 PN - Expected Result: 1% tax", async function() {
        // mint pal to user
        await this.lmvxNft.mint(this.user.address);
        await this.palNft.mint(this.user.address);
        await this.pnNft.mint(this.user.address);
        // Buy token for 0.01 eth
        const ethToBuy = ethers.utils.parseEther("0.01");
        const curTime = await getCurrentTime();
        await this.router.swapExactETHForTokens(ethToBuy, [this.wethAddress, this.token.address], this.user.address, curTime + 50, {value: ethToBuy});
        
        const taxAmount = await this.token.balanceOf(this.treasuryHandler.address);
        const rewardAmount = await this.token.balanceOf(this.gameVault.address);
        const swapAmount = await this.token.balanceOf(this.user.address);
        const totalAmount = taxAmount.add(rewardAmount).add(swapAmount);
        expect(BN.from(10000)).to.closeTo(taxAmount.mul(1000000).div(totalAmount), 1); // expect 1% tax
        expect(rewardAmount).to.equal(BN.from(0)); // expect no reward
    });
    
});
