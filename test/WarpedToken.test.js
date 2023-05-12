const { ethers } = require('hardhat')
const { expect } = require('chai')
const {
	constants, // Common constants, like the zero address and largest integers
	expectEvent, // Assertions for emitted events
	expectRevert // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers')
const BN = ethers.BigNumber

describe('WarpedToken', function () {
	before(async function () {
		this.WarpedToken = await ethers.getContractFactory('WarpedToken')
		this.TaxHandlerStub = await ethers.getContractFactory('TaxHandlerStub')
		this.TreasuryHandlerStub = await ethers.getContractFactory(
			'TreasuryHandlerStub'
		)
		const [owner, user, tester, pool, vault, warpedTreasury] =
			await ethers.getSigners()
		this.owner = owner
		this.user = user
		this.tester = tester
		this.pool = pool
		this.vault = vault
		this.warpedTreasury = warpedTreasury
	})

	beforeEach(async function () {
		this.treasuryHandler = await this.TreasuryHandlerStub.deploy()
		await this.treasuryHandler.deployed()
		this.taxHandler = await this.TaxHandlerStub.deploy()
		await this.taxHandler.deployed()
		this.token = await this.WarpedToken.deploy(
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
			ethers.utils.parseEther('10000000000')
		)
	})

	it('sending tax, reward and burn are working correctly', async function () {
		const taxAmount = ethers.utils.parseEther('1000')
		await this.taxHandler.setTestData(taxAmount)
		await this.token.transfer(
			this.user.address,
			ethers.utils.parseEther('5000')
		)
		expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(
			taxAmount
		)
	})

	it('token transfer call treasuryHandler only 1 time', async function () {
		await this.token.transfer(
			this.user.address,
			ethers.utils.parseEther('5000')
		)
		expect(await this.treasuryHandler.calledTime()).to.equal(BN.from(1))
	})
})
