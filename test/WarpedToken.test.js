const { ethers } = require("hardhat")
const { expect } = require("chai")
const { addresses } = require("../config")
const {
	expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers")

const BN = ethers.BigNumber

describe("WarpedToken", function () {
	before(async function () {
		this.WarpedToken = await ethers.getContractFactory("WarpedToken")
		this.TaxHandlerStub = await ethers.getContractFactory("TaxHandlerStub")
		this.TreasuryHandlerStub = await ethers.getContractFactory(
			"TreasuryHandlerStub"
		)
		const [owner, user, tester, pool, vault, warpedTreasury, testAccount] =
			await ethers.getSigners()
		this.owner = owner
		this.user = user
		this.tester = tester
		this.pool = pool
		this.vault = vault
		this.warpedTreasury = warpedTreasury
		this.testAddress = testAccount.address
	})

	beforeEach(async function () {
		this.treasuryHandler = await this.TreasuryHandlerStub.deploy()
		await this.treasuryHandler.deployed()
		this.taxHandler = await this.TaxHandlerStub.deploy()
		await this.taxHandler.deployed()
		this.token = await this.WarpedToken.deploy(
			this.owner.address,
			this.taxHandler.address,
			this.treasuryHandler.address
		)
		await this.token.deployed()
		await this.treasuryHandler.setTokenAndPool(
			this.token.address,
			this.pool.address
		)
	})

	it("mint tokens doesn't transfer reward", async function () {
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			BN.from(0)
		)
		expect(await this.token.totalSupply()).to.equal(
			ethers.utils.parseEther("10000000000")
		)
		expect(await this.token.balanceOf(this.owner.address)).to.equal(
			ethers.utils.parseEther("10000000000")
		)
	})

	it("sending tax, reward and burn are working correctly", async function () {
		const taxAmount = ethers.utils.parseEther("1000")
		await this.taxHandler.setTestData(taxAmount)
		await this.token.transfer(
			this.user.address,
			ethers.utils.parseEther("5000")
		)
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			taxAmount
		)
	})

	it("token transfer call treasuryHandler only 1 time", async function () {
		await this.token.transfer(
			this.user.address,
			ethers.utils.parseEther("5000")
		)
		expect(await this.treasuryHandler.calledTime()).to.equal(BN.from(1))
	})

	it("updateTaxHandler and updateTreasuryHandler reverts for forbidden user", async function () {
		const _token = this.token.connect(this.tester)
		await expectRevert(
			_token.updateTaxHandler(this.testAddress),
			"Ownable: caller is not the owner"
		)

		await expectRevert(
			_token.updateTreasuryHandler(this.testAddress),
			"Ownable: caller is not the owner"
		)
	})

	it("updateTaxHandler and updateTreasuryHandler reverts for invalid inputs", async function () {
		await expectRevert(
			this.token.updateTaxHandler(this.taxHandler.address),
			"Same tax handler address"
		)
		await expectRevert(
			this.token.updateTaxHandler(addresses.NULL_ADDRESS),
			"Zero tax handler address"
		)

		await expectRevert(
			this.token.updateTreasuryHandler(this.treasuryHandler.address),
			"Same treasury handler address"
		)
		await expectRevert(
			this.token.updateTreasuryHandler(addresses.NULL_ADDRESS),
			"Zero treasury handler address"
		)
	})

	it("updateTaxHandler and updateTreasuryHandler updates handlers successfully", async function () {
		await this.token.updateTaxHandler(this.testAddress)
		expect(await this.token.taxHandler()).to.equal(this.testAddress)

		await this.token.updateTreasuryHandler(this.testAddress)
		expect(await this.token.treasuryHandler()).to.equal(this.testAddress)
	})
})
