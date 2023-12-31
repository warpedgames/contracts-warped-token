const { ethers } = require("hardhat")
const { expect } = require("chai")
const {
	constants, // Common constants, like the zero address and largest integers
	expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers")
const { nftLevels } = require("../config/index")

const BN = ethers.BigNumber

describe("WarpedTaxHandler", function () {
	before(async function () {
		this.WarpedTaxHandler = await ethers.getContractFactory("WarpedTaxHandler")
		this.PoolManager = await ethers.getContractFactory("WarpedPoolManager")
		this.ERC721 = await ethers.getContractFactory("ERC721Stub")
		this.ERC1155 = await ethers.getContractFactory("ERC1155Stub")
		this.textAmount = BN.from(400)
		this.percentDecimal = BN.from(10000)
		this.highTaxRate = BN.from(400)
		this.basicTaxRate = BN.from(300)
		this.lowestTaxRate = BN.from(100)
		this.middleTaxRate = BN.from(200)
		this.zeroAmount = BN.from(0)
		this.signers = await ethers.getSigners()
		this.testAmount = BN.from(10000)
	})

	beforeEach(async function () {
		// Deploy pool manager
		this.poolManager = await this.PoolManager.deploy()
		await this.poolManager.deployed()

		// Deploy tax handler
		this.taxHandler = await this.WarpedTaxHandler.deploy(
			this.poolManager.address,
			[],
			[]
		)
		await this.taxHandler.deployed()

		if (this.currentTest.title.includes("with NFTs")) {
			// Deploy nft contracts
			this.nft1 = await this.ERC721.deploy()
			this.nft2 = await this.ERC721.deploy()
			this.nft3 = await this.ERC721.deploy()
			this.erc1155 = await this.ERC1155.deploy()
			await this.nft1.deployed()
			await this.nft2.deployed()
			await this.nft3.deployed()
			await this.erc1155.deployed()
		}
	})

	it("getTax(no NFTs) returns zero with no-pool, zero buyer/seller address, zero amount", async function () {
		// Test for zero input
		const taxAmount = await this.taxHandler.getTax(
			constants.ZERO_ADDRESS,
			constants.ZERO_ADDRESS,
			this.zeroAmount
		)
		expect(taxAmount).to.equal(this.zeroAmount)
	})

	it("getTax(no NFTs) returns zero with no-pool, zero buyer/seller address, non-zero amount", async function () {
		const taxAmount = await this.taxHandler.getTax(
			constants.ZERO_ADDRESS,
			constants.ZERO_ADDRESS,
			BN.from(100)
		)
		expect(taxAmount).to.equal(this.zeroAmount)
	})

	it("getTax(no NFTs) returns zero with pool, zero buyer address, zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			constants.ZERO_ADDRESS,
			this.zeroAmount
		)
		expect(taxAmount).to.equal(this.zeroAmount)
	})

	it("getTax(no NFTs) returns default rated tax with pool, zero buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			constants.ZERO_ADDRESS,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.highTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(no NFTs) returns zero tax with pool, both pool address, non-zero amount", async function () {
		const pool1Address = this.signers[0].address
		const pool2Address = this.signers[1].address
		await this.poolManager.addExchangePool(pool1Address)
		await this.poolManager.addExchangePool(pool2Address)

		const taxAmount = await this.taxHandler.getTax(
			pool1Address,
			pool2Address,
			this.testAmount
		)
		expect(taxAmount).to.equal(this.zeroAmount)
	})

	it("getTax(with NFTs) revert with pool, zero buyer address, zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		// add one nft1 address with level 1
		await this.taxHandler.addNFTs([this.nft1.address], [1])

		await expectRevert(
			this.taxHandler.getTax(
				poolAddress,
				constants.ZERO_ADDRESS,
				this.zeroAmount
			),
			"ERC721: address zero is not a valid owner"
		)
	})

	it("getTax(with NFTs) returns default tax and reward amount with pool, non-zero non-nft-owned buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		// add one nft1 address with level 1
		await this.taxHandler.addNFTs([this.nft1.address], [1])

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			this.signers[1].address,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.highTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns default tax and burn amount with pool, non-zero non-nft-owned seller address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		// add one nft1 address with level 1
		await this.taxHandler.addNFTs([this.nft1.address], [1])

		const taxAmount = await this.taxHandler.getTax(
			this.signers[1].address,
			poolAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.highTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns default tax and zero burn amount with pool, 2-nfts-owned seller address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		const sellerAddress = this.signers[1].address
		await this.poolManager.addExchangePool(poolAddress)
		// add one nft1 address with level 1
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address],
			[1, 4]
		)
		// mint 2 nfts into buyer address
		await this.nft1.mint(sellerAddress)
		await this.nft2.mint(sellerAddress)

		const taxAmount = await this.taxHandler.getTax(
			sellerAddress,
			poolAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.middleTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns zero reward and burn amount with pool, non-zero nft-owned buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add one nft1 address with level 1
		await this.taxHandler.addNFTs([this.nft1.address], [1])
		// mint 1 nft into buyer address
		await this.nft1.mint(buyerAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.basicTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns lowest tax amount with pool, non-zero safe-nft-owned buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add one nft1 address with level 8
		await this.taxHandler.addNFTs([this.nft1.address], [8])
		// mint 1 nft into buyer address
		await this.nft1.mint(buyerAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.lowestTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns middle tax amount with pool, non-zero lm+pal-nft-owned buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 2 nft address with level 1, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address],
			[1, 4]
		)
		// mint 2 nfts into buyer address
		await this.nft1.mint(buyerAddress)
		await this.nft2.mint(buyerAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.middleTaxRate).div(this.percentDecimal)
		)
	})

	it("getTax(with NFTs) returns lowest tax amount with pool, non-zero lm+pal+pn-nft-owned buyer address, non-zero amount", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft1.mint(buyerAddress)
		await this.nft2.mint(buyerAddress)
		await this.nft3.mint(buyerAddress)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.lowestTaxRate).div(this.percentDecimal)
		)
	})

	it("after update tax rates points using setTaxRates: getTax(with NFTs) returns lowest tax amount with all-nft-owned buyer address", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft1.mint(buyerAddress)
		await this.nft2.mint(buyerAddress)
		await this.nft3.mint(buyerAddress)
		await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.lowestTaxRate).div(this.percentDecimal)
		)
	})

	it("after update tax rates points using setTaxRates: getTax(with NFTs) returns middle tax amount with one-nft-owned buyer address", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft2.mint(buyerAddress)
		await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.middleTaxRate).div(this.percentDecimal)
		)
	})

	it("setTaxRates should revert for over limit input", async function () {
		await expectRevert(
			this.taxHandler.setTaxRates(
				[1024, 1023, 511, 255, 127, 63, 31, 15, 7, 2, 1],
				[
					BN.from(100),
					BN.from(110),
					BN.from(120),
					BN.from(130),
					BN.from(140),
					BN.from(150),
					BN.from(160),
					BN.from(170),
					BN.from(180),
					BN.from(190),
					BN.from(200)
				],
				BN.from(400)
			),
			"Tax rates limit exceeded"
		)
	})

	it("after update tax rates points using setTaxRates: getTax(with NFTs) returns tax and reward amount with one-nft-owned buyer address", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft1.mint(buyerAddress)
		await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.basicTaxRate).div(this.percentDecimal)
		)
	})

	it("after pause tax, getTax(with NFTs) returns zero", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft1.mint(buyerAddress)
		await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)
		await this.taxHandler.pauseTax()

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(this.zeroAmount)
	})

	it("after pause tax, after resume tax, getTax(with NFTs) returns valid", async function () {
		const poolAddress = this.signers[0].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[1].address
		// add 3 nfts address with level 1, 2, 4
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		// mint 3 nft into buyer address
		await this.nft1.mint(buyerAddress)
		await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)
		await this.taxHandler.pauseTax()
		await this.taxHandler.resumeTax()

		const taxAmount = await this.taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.basicTaxRate).div(this.percentDecimal)
		)
	})

	it("setTaxRates reverts for forbidden user", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.setTaxRates(
				[7, 2, 1],
				[BN.from(100), BN.from(200), BN.from(300)],
				BN.from(400)
			),
			"Ownable: caller is not the owner"
		)
	})

	it("setTaxRates reverts when thresholds are not in descending order", async function () {
		await expectRevert(
			this.taxHandler.setTaxRates(
				[2, 7, 1],
				[BN.from(200), BN.from(100), BN.from(300)],
				BN.from(400)
			),
			"Thresholds not descending order"
		)
	})

	it("setTaxRates reverts for invalid parameters", async function () {
		await expectRevert(
			this.taxHandler.setTaxRates(
				[7, 2, 1],
				[BN.from(100), BN.from(200)],
				BN.from(400)
			),
			"Invalid level points"
		)
		await expectRevert(
			this.taxHandler.setTaxRates(
				[7, 2],
				[BN.from(100), BN.from(200)],
				BN.from(0)
			),
			"Invalid base rate"
		)
	})

	it("setTaxRates emits event correctly", async function () {
		const result = await this.taxHandler.setTaxRates(
			[7, 2, 1],
			[BN.from(100), BN.from(200), BN.from(300)],
			BN.from(400)
		)
		const setTaxRatesReceipt = await result.wait()
		const events = setTaxRatesReceipt.events.filter(
			(e) => e.event === "TaxRatesUpdated"
		)
		expect(events.length).to.equal(1, "No event for setTaxRates")
		expect(events[0].args[0]).to.eql(
			[BN.from(7), BN.from(2), BN.from(1)],
			"thresholds parameter incorrect for TaxRatesUpdated event"
		)
		expect(events[0].args[1]).to.eql(
			[BN.from(100), BN.from(200), BN.from(300)],
			"rates parameter incorrect for TaxRatesUpdated event"
		)
		expect(events[0].args[2]).to.equal(
			BN.from(400),
			"basisTaxRate parameter incorrect for TaxRatesUpdated event"
		)
	})

	it("addNFTs reverts for forbidden user", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.addNFTs(
				[this.nft1.address, this.nft2.address, this.nft3.address],
				[1, 2, 4]
			),
			"Ownable: caller is not the owner"
		)
	})

	it("addNFTs reverts when adding a duplicate NFT contract and reverts for zero nft level", async function () {
		this.taxHandler.addNFTs([this.nft1.address, this.nft2.address], [1, 2])
		await expectRevert(
			this.taxHandler.addNFTs([this.nft2.address, this.nft3.address], [2, 4]),
			"Duplicate NFT contract"
		)
		await expectRevert(
			this.taxHandler.addNFTs([this.nft3.address], [0]),
			"Invalid NFT level"
		)
	})

	it("addNFTs emits events correctly", async function () {
		const result = await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[1, 2, 4]
		)
		const addNFTsReceipt = await result.wait()
		const events = addNFTsReceipt.events.filter((e) => e.event === "NFTsAdded")
		expect(events.length).to.equal(1, "No event for addNFTs")
		expect(events[0].args[0]).to.eql(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			"contracts parameter incorrect for NFTsAdded event"
		)
		expect(events[0].args[1]).to.eql(
			[1, 2, 4],
			"levels parameter incorrect for NFTsAdded event"
		)
	})

	it("pauseTax reverts for forbidden user and when already disabled", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.pauseTax(),
			"Ownable: caller is not the owner"
		)
		await this.taxHandler.pauseTax()
		await expectRevert(this.taxHandler.pauseTax(), "Already paused")
	})

	it("pauseTax/resumeTax emits events correctly", async function () {
		const pauseTaxResult = await this.taxHandler.pauseTax()
		const pauseTaxReceipt = await pauseTaxResult.wait()
		const pauseTaxEvents = pauseTaxReceipt.events.filter(
			(e) => e.event === "TaxPaused"
		)
		expect(pauseTaxEvents.length).to.equal(1, "No event for TaxPaused")
		expect(pauseTaxEvents[0].args.length).to.equal(0, "No event for TaxPaused")

		const resumeTaxResult = await this.taxHandler.resumeTax()
		const resumeTaxReceipt = await resumeTaxResult.wait()
		const resumeTaxEvents = resumeTaxReceipt.events.filter(
			(e) => e.event === "TaxResumed"
		)
		expect(resumeTaxEvents.length).to.equal(1, "No event for TaxResumed")
		expect(resumeTaxEvents[0].args.length).to.equal(
			0,
			"No event for TaxResumed"
		)
	})

	it("resume reverts for forbidden user and when not disabled", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.resumeTax(),
			"Ownable: caller is not the owner"
		)
		await expectRevert(this.taxHandler.resumeTax(), "Not paused")
		await this.taxHandler.pauseTax()
		await this.taxHandler.resumeTax()
		await expectRevert(this.taxHandler.resumeTax(), "Not paused")
	})

	it("addNFTs reverts for invalid parameters", async function () {
		await expectRevert(
			this.taxHandler.addNFTs(
				[this.nft1.address, this.nft2.address, this.nft3.address],
				[1]
			),
			"Invalid parameters"
		)
		await expectRevert(this.taxHandler.addNFTs([], []), "Invalid parameters")
	})

	it("addNFTs reverts for zero address", async function () {
		await expectRevert(
			this.taxHandler.addNFTs([ethers.constants.AddressZero], [1]),
			"contract address is zero address"
		)
	})

	it("after deploy with 5 nfts, getTax(with NFTs) returns lowest tax amount with pool, non-zero lmvx+pal+pn-owned buyer address, non-zero amount", async function () {
		const nft4 = await this.ERC721.deploy()
		await nft4.deployed()
		const nft5 = await this.ERC721.deploy()
		await nft5.deployed()
		const _taxHandler = await this.WarpedTaxHandler.deploy(
			this.poolManager.address,
			[
				this.nft1.address,
				this.nft2.address,
				this.nft3.address,
				nft4.address,
				nft5.address
			],
			nftLevels
		)
		await _taxHandler.deployed()

		const poolAddress = this.signers[1].address
		await this.poolManager.addExchangePool(poolAddress)
		const buyerAddress = this.signers[0].address
		// mint 3 nfts into buyer address
		await this.nft2.mint(buyerAddress)
		await nft4.mint(buyerAddress)
		await nft5.mint(buyerAddress)

		const taxAmount = await _taxHandler.getTax(
			poolAddress,
			buyerAddress,
			this.testAmount
		)
		expect(taxAmount).to.equal(
			this.testAmount.mul(this.lowestTaxRate).div(this.percentDecimal)
		)
	})

	it("Should fail if basis tax rate is greater than max", async function () {
		await expectRevert(
			this.taxHandler.setTaxRates(
				[1, 2, 3],
				[BN.from(100), BN.from(200), BN.from(300)],
				BN.from(500)
			),
			"Base rate must be <= than max"
		)
	})

	it("Should fail if any provided rate is greater than max", async function () {
		await expect(
			this.taxHandler.setTaxRates(
				[1, 2, 3],
				[BN.from(100), BN.from(500), BN.from(300)],
				400
			)
		).to.be.revertedWith("Rate must be less than max rate")
	})

	it("Remove nfts failed for forbidden user and no input", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.removeNFTs([
				this.nft1.address,
				this.nft2.address,
				this.nft3.address
			]),
			"Ownable: caller is not the owner"
		)
		await expectRevert(this.taxHandler.removeNFTs([]), "Invalid parameters")
	})

	it("with NFTs, removeNFTs emit events correctly", async function () {
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[4, 2, 1]
		)
		const removeNFTsResult = await this.taxHandler.removeNFTs([
			this.nft1.address,
			this.nft2.address
		])
		const removeNFTsReceipt = await removeNFTsResult.wait()
		const removeNFTsEvents = removeNFTsReceipt.events.filter(
			(e) => e.event === "NFTsRemoved"
		)
		expect(removeNFTsEvents.length).to.equal(1, "No event for removeNFTs")
		expect(removeNFTsEvents[0].args[0]).eql(
			[this.nft1.address, this.nft2.address],
			"contracts parameter incorrect for NFTsRemoved event"
		)
	})

	it("with NFTs, addNFTs reverts when length is over limit and success when less than limit", async function () {
		// Deploy nft contracts
		const nft4 = await this.ERC721.deploy()
		const nft5 = await this.ERC721.deploy()
		const nft6 = await this.ERC721.deploy()
		const nft7 = await this.ERC721.deploy()
		const nft8 = await this.ERC721.deploy()
		const nft9 = await this.ERC721.deploy()
		const nft10 = await this.ERC721.deploy()
		const nft11 = await this.ERC721.deploy()
		await nft4.deployed()
		await nft5.deployed()
		await nft6.deployed()
		await nft7.deployed()
		await nft8.deployed()
		await nft9.deployed()
		await nft10.deployed()
		await nft11.deployed()

		// revert for 11 nft contracts
		await expectRevert(
			this.taxHandler.addNFTs(
				[
					this.nft1.address,
					this.nft2.address,
					this.nft3.address,
					nft4.address,
					nft5.address,
					nft6.address,
					nft7.address,
					nft8.address,
					nft9.address,
					nft10.address,
					nft11.address
				],
				[1, 2, 4, 4, 8, 8, 1, 2, 4, 1, 1]
			),
			"No. of NFT contracts over limit"
		)
		// success for 10 nft contracts
		await this.taxHandler.addNFTs(
			[
				this.nft1.address,
				this.nft2.address,
				this.nft3.address,
				nft4.address,
				nft5.address,
				nft6.address,
				nft7.address,
				nft8.address,
				nft9.address,
				nft10.address
			],
			[1, 2, 4, 4, 8, 8, 1, 2, 4, 1]
		)
		// remove 3 nft contracts
		await this.taxHandler.removeNFTs([
			this.nft1.address,
			this.nft2.address,
			this.nft3.address
		])
		// add 4 nft contracts should revert because current 7 nft contracts added
		await expectRevert(
			this.taxHandler.addNFTs(
				[
					this.nft1.address,
					this.nft2.address,
					this.nft3.address,
					nft11.address
				],
				[1, 2, 4, 8]
			),
			"No. of NFT contracts over limit"
		)
	})

	it("with NFTs, Remove nfts successfullly remove nft contracts and levels", async function () {
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[4, 2, 1]
		)
		await this.taxHandler.removeNFTs([this.nft1.address, this.nft2.address])
		expect(await this.taxHandler.nftLevels(this.nft1.address)).to.be.equal(0)
		expect(await this.taxHandler.nftLevels(this.nft2.address)).to.be.equal(0)
		expect(await this.taxHandler.nftLevels(this.nft3.address)).to.be.equal(1)
		expect(await this.taxHandler.nftContracts(0)).to.be.equal(this.nft3.address)

		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address],
			[4, 2]
		)
		expect(await this.taxHandler.nftLevels(this.nft1.address)).to.be.equal(4)
		expect(await this.taxHandler.nftLevels(this.nft2.address)).to.be.equal(2)
		expect(await this.taxHandler.nftLevels(this.nft3.address)).to.be.equal(1)

		await this.taxHandler.removeNFTs([this.nft3.address])
		expect(await this.taxHandler.nftContracts(0)).to.be.equal(this.nft2.address)
		expect(await this.taxHandler.nftContracts(1)).to.be.equal(this.nft1.address)
		expect(await this.taxHandler.nftLevels(this.nft1.address)).to.be.equal(4)
		expect(await this.taxHandler.nftLevels(this.nft2.address)).to.be.equal(2)
		expect(await this.taxHandler.nftLevels(this.nft3.address)).to.be.equal(0)
	})

	it("with NFTs, addNFTs revert for non-erc721 contract", async function () {
		await expectRevert(
			this.taxHandler.addNFTs([this.erc1155.address], [4]),
			"IERC721 not implemented"
		)
		// test contract address but not implement IERC165
		await expectRevert(
			this.taxHandler.addNFTs([this.taxHandler.address], [4]),
			"function selector was not recognized and there's no fallback function"
		)
		// test non-contract address
		await expectRevert(
			this.taxHandler.addNFTs([this.signers[2].address], [4]),
			"function returned an unexpected amount of data"
		)
	})
})
