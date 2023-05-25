const { ethers } = require("hardhat")
const { expect } = require("chai")
const uniswapRouterAbi = require("./abis/uniswapRouterAbi.json")
const { nftLevels } = require("../config/index")

const BN = ethers.BigNumber

const getCurrentTime = async () => {
	const blockNumBefore = await ethers.provider.getBlockNumber()
	const blockBefore = await ethers.provider.getBlock(blockNumBefore)
	const timestampBefore = blockBefore.timestamp
	return timestampBefore
}

describe("Integration Test 1", function () {
	before(async function () {
		this.WarpedTokenManager = await ethers.getContractFactory(
			"WarpedTokenManager"
		)
		this.WarpedToken = await ethers.getContractFactory("WarpedToken")
		this.WarpedTaxHandler = await ethers.getContractFactory("WarpedTaxHandler")
		this.WarpedTreasuryHandler = await ethers.getContractFactory(
			"WarpedTreasuryHandler"
		)
		this.ERC721 = await ethers.getContractFactory("ERC721Stub")
		const [owner, user, tester, pool, rewardVault, warpedTreasury, taxWallet] =
			await ethers.getSigners()
		this.owner = owner
		this.user = user
		this.tester = tester
		this.pool = pool
		this.rewardVault = rewardVault
		this.warpedTreasury = warpedTreasury
		this.taxWallet = taxWallet
	})

	beforeEach(async function () {
		await this.taxWallet.sendTransaction({
			value: ethers.utils.parseEther("1000"),
			to: this.owner.address
		})

		this.sateNft = await this.ERC721.deploy()
		this.lmvxNft = await this.ERC721.deploy()
		this.stlmvxNft = await this.ERC721.deploy()
		this.palNft = await this.ERC721.deploy()
		this.pnNft = await this.ERC721.deploy()
		this.otherNft1 = await this.ERC721.deploy()
		this.otherNft2 = await this.ERC721.deploy()

		await this.sateNft.deployed()
		await this.lmvxNft.deployed()
		await this.stlmvxNft.deployed()
		await this.palNft.deployed()
		await this.otherNft1.deployed()
		await this.otherNft2.deployed()

		const nftContracts = [
			this.sateNft.address,
			this.lmvxNft.address,
			this.stlmvxNft.address,
			this.palNft.address,
			this.pnNft.address,
			this.otherNft1.address,
			this.otherNft1.address
		]

		this.manager = await this.WarpedTokenManager.deploy(
			this.taxWallet.address,
			nftContracts,
			[...nftLevels, 1, 1]
		)
		await this.manager.deployed()

		this.token = await this.WarpedToken.attach(await this.manager.warpedToken())
		this.treasuryHandler = await this.WarpedTreasuryHandler.attach(
			await this.token.treasuryHandler()
		)
		this.taxHandler = await this.WarpedTaxHandler.attach(
			await this.token.taxHandler()
		)

		const tokenToLiquidity = ethers.utils.parseEther("500000000")
		const ethToLiquidity = ethers.utils.parseEther("1000")
		await this.manager.addLiquidity(tokenToLiquidity, {
			value: ethToLiquidity
		})

		this.router = await ethers.getContractAt(
			uniswapRouterAbi,
			"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
		)
		this.wethAddress = await this.router.WETH()
	})

	it(".01 ETH buy - no NFTs - Expected Result: 4% tax into treasury handler address", async function () {
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 100,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(taxAmount).to.equal(totalAmount.mul(4).div(100))
	})

	it(".01 ETH sell - no NFTs - Expected Result: 4% tax into treasury handler address", async function () {
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const tokenToSell = ethers.utils.parseEther("4000")
		const _router = this.router.connect(this.user)
		const _token = this.token.connect(this.user)
		await _token.approve(_router.address, tokenToSell)
		const _curBalance = await _token.balanceOf(this.treasuryHandler.address)
		await _router.swapExactTokensForETHSupportingFeeOnTransferTokens(
			tokenToSell,
			0,
			[this.token.address, this.wethAddress],
			this.user.address,
			curTime + 100
		)
		expect(await _token.balanceOf(this.treasuryHandler.address)).to.equal(
			_curBalance.add(tokenToSell.mul(4).div(100))
		)
	})

	it(".01 ETH buy/sell - 1 PAL - Expected Result: 3% tax", async function () {
		// mint pal to user
		await this.palNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(30000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 3% tax

		const tokenToSell = ethers.utils.parseEther("4000")
		const _router = this.router.connect(this.user)
		const _token = this.token.connect(this.user)
		await _token.approve(_router.address, tokenToSell)
		await _router.swapExactTokensForETHSupportingFeeOnTransferTokens(
			tokenToSell,
			0,
			[this.token.address, this.wethAddress],
			this.user.address,
			curTime + 100
		)
		const taxAmount2 = await this.token.balanceOf(this.treasuryHandler.address)
		expect(taxAmount.add(tokenToSell.mul(3).div(100))).to.closeTo(
			taxAmount2,
			BN.from(1)
		)
	})

	it(".01 ETH buy/sell - 1 PN - Expected Result: 3% tax", async function () {
		// mint pal to user
		await this.pnNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(30000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 3% tax
	})

	it(".01 ETH buy/sell - 1 LMvX - Expected Result: 3% tax", async function () {
		// mint pal to user
		await this.lmvxNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(30000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 3% tax
	})

	it(".01 ETH buy/sell - 1 LM / 1 PN - Expected Result: 2% tax", async function () {
		// mint pal to user
		await this.lmvxNft.mint(this.user.address)
		await this.pnNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(20000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 2% tax
	})

	it(".01 ETH buy/sell - 1 LM / 1 PAL - Expected Result: 2% tax", async function () {
		// mint pal to user
		await this.lmvxNft.mint(this.user.address)
		await this.pnNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(20000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 2% tax
	})

	it(".01 ETH buy/sell - 1 LM / 1 PAL / 1 PN - Expected Result: 1% tax", async function () {
		// mint pal to user
		await this.lmvxNft.mint(this.user.address)
		await this.palNft.mint(this.user.address)
		await this.pnNft.mint(this.user.address)
		// Buy token for 0.01 eth
		const ethToBuy = ethers.utils.parseEther("0.01")
		const curTime = await getCurrentTime()
		await this.router.swapExactETHForTokens(
			ethToBuy,
			[this.wethAddress, this.token.address],
			this.user.address,
			curTime + 50,
			{ value: ethToBuy }
		)

		const taxAmount = await this.token.balanceOf(this.treasuryHandler.address)
		const swapAmount = await this.token.balanceOf(this.user.address)
		const totalAmount = taxAmount.add(swapAmount)
		expect(BN.from(10000)).to.closeTo(
			taxAmount.mul(1000000).div(totalAmount),
			1
		) // expect 1% tax
	})
})
