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

	it("pauseTax reverts for forbidden user and when already disabled", async function () {
		const _taxHandler = this.taxHandler.connect(this.signers[1])
		await expectRevert(
			_taxHandler.pauseTax(),
			"Ownable: caller is not the owner"
		)
		await this.taxHandler.pauseTax()
		await expectRevert(this.taxHandler.pauseTax(), "Already paused")
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

	it("with NFTs, Remove nfts successfullly remove nft contracts and levels", async function () {
		await this.taxHandler.addNFTs(
			[this.nft1.address, this.nft2.address, this.nft3.address],
			[4, 2, 1]
		)
		await this.taxHandler.removeNFTs([this.nft1.address, this.nft2.address])
		expect(await this.taxHandler.nftLevels(this.nft1.address)).to.be.equal(0)
		expect(await this.taxHandler.nftLevels(this.nft2.address)).to.be.equal(0)
		expect(await this.taxHandler.nftLevels(this.nft3.address)).is.greaterThan(0)
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
