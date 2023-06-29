const { ethers } = require("hardhat")
const { expect } = require("chai")
const {
	constants, // Common constants, like the zero address and largest integers
	expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers")
const uniswapRouterAbi = require("./abis/uniswapRouterAbi.json")
const uniswapFactoryAbi = require("./abis/uniswapFactoryAbi.json")

const BN = ethers.BigNumber

const getCurrentTime = async () => {
	const blockNumBefore = await ethers.provider.getBlockNumber()
	const blockBefore = await ethers.provider.getBlock(blockNumBefore)
	const timestampBefore = blockBefore.timestamp
	return timestampBefore
}

describe("WarpedTreasuryHandler", function () {
	before(async function () {
		this.WarpedTreasuryHandler = await ethers.getContractFactory(
			"WarpedTreasuryHandler"
		)
		this.PoolManager = await ethers.getContractFactory("WarpedPoolManager")
		this.ERC20Stub = await ethers.getContractFactory("ERC20Stub")
		this.totalSupply = ethers.utils.parseEther("10000000000")
		this.signers = await ethers.getSigners()
		this.liquidityBasisPoint = BN.from(2000)
		this.priceImpactBasisPoint = BN.from(500)
	})

	beforeEach(async function () {
		// Deploy pool manager
		this.poolManager = await this.PoolManager.deploy()
		await this.poolManager.deployed()

		// Deploy tax handler
		this.token = await this.ERC20Stub.deploy(this.totalSupply)
		await this.token.deployed()

		this.treasuryHandler = await this.WarpedTreasuryHandler.deploy(
			this.poolManager.address
		)
		await this.treasuryHandler.deployed()

		if (this.currentTest.title.includes("after init,")) {
			await this.treasuryHandler.initialize(
				this.signers[1].address,
				this.token.address
			)
		}
		if (this.currentTest.title.includes("after pool added,")) {
			const router = await ethers.getContractAt(
				uniswapRouterAbi,
				"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
			)
			const factory = await ethers.getContractAt(
				uniswapFactoryAbi,
				await router.factory()
			)
			const wethAddress = await router.WETH()
			await factory.createPair(this.token.address, wethAddress)
			const tokenToLiquidity = ethers.utils.parseEther("1000000000")
			const ethToLiquidity = ethers.utils.parseEther("1000")
			const curTime = await getCurrentTime()
			// 1k token price in eth = 1 eth
			await this.token.approve(router.address, tokenToLiquidity)
			await router.addLiquidityETH(
				this.token.address,
				tokenToLiquidity,
				tokenToLiquidity,
				ethToLiquidity,
				this.signers[0].address,
				curTime + 100,
				{
					value: ethToLiquidity
				}
			)
			this.pairAddress = await factory.getPair(this.token.address, wethAddress)
			// this.pairAddress = this.signers[2].address
			await this.poolManager.addExchangePool(this.pairAddress)
			await this.poolManager.setPrimaryPool(this.pairAddress)
			this.router = router
			this.wethAddress = wethAddress
		}
	})

	it("init reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		await expectRevert(
			_treasuryHandler.initialize(this.signers[0].address, this.token.address),
			"Ownable: caller is not the owner"
		)
	})

	it("after init, init reverts as already init", async function () {
		await expectRevert(
			this.treasuryHandler.initialize(
				this.signers[0].address,
				this.token.address
			),
			"Already initialized"
		)
	})

	it("setLiquidityBasisPoints reverts when input is invalid", async function () {
		await expectRevert(
			this.treasuryHandler.setLiquidityBasisPoints(BN.from(11000)),
			"Max is 10000"
		)
	})

	it("setLiquidityBasisPoints reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		await expectRevert(
			_treasuryHandler.setLiquidityBasisPoints(BN.from(1500)),
			"Ownable: caller is not the owner"
		)
	})

	it("after init, setLiquidityBasisPoints update correctly", async function () {
		const newPoint = BN.from(1500)
		await this.treasuryHandler.setLiquidityBasisPoints(newPoint)
		expect(await this.treasuryHandler.liquidityBasisPoints()).to.equal(newPoint)
	})

	it("setPriceImpactBasisPoints reverts when input is invalid", async function () {
		const newPoint = BN.from(1600)
		await expectRevert(
			this.treasuryHandler.setPriceImpactBasisPoints(newPoint),
			"Too high value"
		)
	})

	it("setPriceImpactBasisPoints reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		const newPoint = BN.from(1000)
		await expectRevert(
			_treasuryHandler.setPriceImpactBasisPoints(newPoint),
			"Ownable: caller is not the owner"
		)
	})

	it("after init, setPriceImpactBasisPoints update correctly", async function () {
		const newPoint = BN.from(1000)
		await this.treasuryHandler.setPriceImpactBasisPoints(newPoint)
		expect(await this.treasuryHandler.priceImpactBasisPoints()).to.equal(
			newPoint
		)
	})

	it("after init, setTreasury update new address correctly", async function () {
		const newAddress = this.signers[1].address
		await this.treasuryHandler.setTreasury(newAddress)
		expect(await this.treasuryHandler.treasury()).to.equal(newAddress)
	})

	it("setTreasury reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		await expectRevert(
			_treasuryHandler.setTreasury(this.signers[1].address),
			"Ownable: caller is not the owner"
		)
	})

	it("setTreasury reverts for invalid address", async function () {
		await expectRevert(
			this.treasuryHandler.setTreasury(constants.ZERO_ADDRESS),
			"Zero address"
		)
	})

	it("withdraw reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		await expectRevert(
			_treasuryHandler.withdraw(constants.ZERO_ADDRESS, BN.from(100)),
			"Ownable: caller is not the owner"
		)
	})

	it("after init, withdraw successfully withdraw ethers in contract", async function () {
		const ethBalance = ethers.utils.parseEther("1")
		await this.signers[1].sendTransaction({
			to: this.treasuryHandler.address,
			value: ethBalance
		})
		await expect(() =>
			this.treasuryHandler.withdraw(constants.ZERO_ADDRESS, ethBalance)
		).to.changeEtherBalance(this.signers[1], ethBalance)
	})

	it("after init, withdraw successfully withdraw tokens in contract", async function () {
		const tokenAmount = ethers.utils.parseEther("1000")
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)
		await expect(() =>
			this.treasuryHandler.withdraw(this.token.address, tokenAmount)
		).to.changeTokenBalance(this.token, this.signers[1], tokenAmount)
	})

	it("updateTaxSwap reverts for forbidden user", async function () {
		const _treasuryHandler = this.treasuryHandler.connect(this.signers[1])
		await expectRevert(
			_treasuryHandler.updateTaxSwap(BN.from(100)),
			"Ownable: caller is not the owner"
		)
	})

	it("updateTaxSwap reverts for invalid input", async function () {
		await expectRevert(
			this.treasuryHandler.updateTaxSwap(BN.from(0)),
			"Zero taxSwap"
		)
	})

	it("updateTaxSwap emits event correctly", async function () {
		const newTaxSwap = ethers.utils.parseEther("20000000")
		const result = await this.treasuryHandler.updateTaxSwap(newTaxSwap)
		const receipt = await result.wait()
		const events = receipt.events.filter((e) => e.event === "TaxSwapUpdated")
		expect(events.length).to.equal(1, "No event for updateTaxSwap")
		expect(events[0].args[0]).to.equal(newTaxSwap, "No event for updateTaxSwap")
	})

	it("processTreasury do nothing if called before init or from is zero or not sell", async function () {
		const tokenAmount = ethers.utils.parseEther("100000")
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)
		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				this.signers[0].address,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))

		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				constants.ZERO_ADDRESS,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))

		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				this.signers[0].address,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))
	})

	it("after pool added, after init, do nothing if 'to' address is not pool address or from is zero", async function () {
		const tokenAmount = ethers.utils.parseEther("100000")
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)

		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				this.signers[0].address,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))

		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				constants.ZERO_ADDRESS,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))
	})

	it("after pool added, after init, do nothing if 'to' address is not pool address", async function () {
		const tokenAmount = ethers.utils.parseEther("100000")
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)

		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				this.signers[0].address,
				this.signers[1].address,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))
	})

	it("after pool added, after init, processTreasury do nothing if balance is less than tax swap", async function () {
		const tokenAmount = ethers.utils.parseEther("1000")
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)

		const primaryPool = await this.poolManager.primaryPool()
		await expect(() =>
			this.token.testTreausryHandler(
				this.treasuryHandler.address,
				this.signers[1].address,
				primaryPool,
				BN.from(100)
			)
		).to.changeTokenBalance(this.token, this.treasuryHandler, BN.from(0))
	})

	it("after pool added, after init, processTreasury work correctly(balance:13m, amount: 1m)", async function () {
		const tokenAmount = ethers.utils.parseEther("13000000")
		// send 11k into treasury contract
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)
		const primaryPool = await this.poolManager.primaryPool()
		await this.token.testTreausryHandler(
			this.treasuryHandler.address,
			this.signers[0].address,
			primaryPool,
			ethers.utils.parseEther("1000000")
		)
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			ethers.utils.parseEther("12000000")
		)
		await this.treasuryHandler.setLiquidityBasisPoints(2000)
		await this.token.testTreausryHandler(
			this.treasuryHandler.address,
			this.signers[0].address,
			primaryPool,
			ethers.utils.parseEther("1000000")
		)

		await this.treasuryHandler.setLiquidityBasisPoints(10000)
		await this.token.testTreausryHandler(
			this.treasuryHandler.address,
			this.signers[0].address,
			primaryPool,
			ethers.utils.parseEther("1000000")
		)
	})

	it("after pool added, after init, updateTaxSwap and processTreasury work correctly", async function () {
		const primaryPool = await this.poolManager.primaryPool()
		await this.token.transfer(
			this.treasuryHandler.address,
			ethers.utils.parseEther("60000000")
		) // balance is 60004000
		await this.treasuryHandler.updateTaxSwap(
			ethers.utils.parseEther("55000000")
		) // 55m > 50m(maxPriceImpact)
		await this.token.testTreausryHandler(
			this.treasuryHandler.address,
			this.signers[0].address,
			primaryPool,
			ethers.utils.parseEther("52000000") //52m > 50m(maxPriceImpact)
		)
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			ethers.utils.parseEther("10000000")
		)

		const tokenAmount = ethers.utils.parseEther("55000")
		// send 55k into treasury contract
		await this.token.transfer(this.treasuryHandler.address, tokenAmount)

		await this.treasuryHandler.updateTaxSwap(ethers.utils.parseEther("51000"))

		await this.token.testTreausryHandler(
			this.treasuryHandler.address,
			this.signers[0].address,
			primaryPool,
			ethers.utils.parseEther("52000")
		)
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			ethers.utils.parseEther("10004000")
		)
	})
})
