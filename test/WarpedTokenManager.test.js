const { ethers } = require("hardhat")
const { expect } = require("chai")
const { nftLevels } = require("../config/index")
const {
	expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers")

const goerliAddresses = require("../addresses/goerli.json")
const addresses = goerliAddresses
const nftContracts = [
	addresses.SATE_NFT_ADDRESS,
	addresses.LMVX_NFT_ADDRESS,
	addresses.STLM_NFT_ADDRESS,
	addresses.STPAL_NFT_ADDRESS,
	addresses.STPN_NFT_ADDRESS
]

describe("WarpedTokenManager", function () {
	before(async function () {
		this.WarpedTokenManager = await ethers.getContractFactory(
			"WarpedTokenManager"
		)
		const [owner, user, tester, pool, rewardVault, warpedTreasury, taxWallet] =
			await ethers.getSigners()
		this.owner = owner
		this.user = user
		this.tester = tester
		this.pool = pool
		this.rewardVault = rewardVault
		this.warpedTreasury = warpedTreasury
		this.taxWallet = taxWallet
		this.validUser = await ethers.getImpersonatedSigner(
			"0x42ed619fdb869d411f9e10befd2df4e3460c280f"
		)
		this.validUserOldTokenMaxAmount = ethers.utils.parseEther("18000000000")
	})

	beforeEach(async function () {
		this.tokenManager = await this.WarpedTokenManager.deploy(
			this.taxWallet.address,
			nftContracts,
			nftLevels
		)
		await this.tokenManager.deployed()

		const tokenAddress = await this.tokenManager.warpedToken()
		this.warpedTokenAbi =
			require("../artifacts/contracts/WarpedToken.sol/WarpedToken.json").abi
		this.token = await ethers.getContractAt(this.warpedTokenAbi, tokenAddress)
	})

	it("constructor create contracts successfully", async function () {
		const token = this.token
		expect(await token.totalSupply()).to.equal(
			ethers.utils.parseEther("10000000000")
		)

		const taxHandlerAddress = await token.taxHandler()
		const warpedTaxHandlerAbi =
			require("../artifacts/contracts/WarpedTaxHandler.sol/WarpedTaxHandler.json").abi
		const taxHandler = await ethers.getContractAt(
			warpedTaxHandlerAbi,
			taxHandlerAddress
		)
		const warpedTreasuryAbi =
			require("../artifacts/contracts/WarpedTreasuryHandler.sol/WarpedTreasuryHandler.json").abi
		const treasuryHandlerAddress = await token.treasuryHandler()
		const treasuryHandler = await ethers.getContractAt(
			warpedTreasuryAbi,
			treasuryHandlerAddress
		)
		expect(await taxHandler.owner()).to.equal(this.owner.address)
		expect(await treasuryHandler.owner()).to.equal(this.owner.address)
		expect(await treasuryHandler.token()).to.equal(token.address)
		expect(await treasuryHandler.treasury()).to.equal(this.taxWallet.address)

		nftContracts.forEach(async (addr, idx) => {
			expect(await taxHandler.nftLevels(addr)).to.equal(nftLevels[idx])
		})
	})

	it("addExchangePool/removeExchangePool reverts for forbidden user", async function () {
		const _tokenManager = this.tokenManager.connect(this.tester)
		await expectRevert(
			_tokenManager.addExchangePool(this.tester.address),
			"Ownable: caller is not the owner"
		)
		await expectRevert(
			_tokenManager.removeExchangePool(this.tester.address),
			"Ownable: caller is not the owner"
		)
	})

	it("removeExchangePool reverts when given poolAddress and current primaryPool address are the same", async function () {
		await this.tokenManager.addExchangePool(this.pool.address)
		await this.tokenManager.setPrimaryPool(this.pool.address)
		await expectRevert(
			this.tokenManager.removeExchangePool(this.pool.address),
			"Primary pool not allowed"
		)
	})

	it("removeExchangePool succeeds when given poolAddress and current primaryPool address are not the same", async function () {
		await this.tokenManager.addExchangePool(this.tester.address)
		await this.tokenManager.setPrimaryPool(this.tester.address)
		await this.tokenManager.removeExchangePool(this.pool.address)
		expect(await this.tokenManager.primaryPool()).not.equal(this.pool.address)
		expect(await this.tokenManager.primaryPool()).to.equal(this.tester.address)
		expect(await this.tokenManager.isPoolAddress(this.pool.address)).to.equal(
			false
		)
	})

	it("addExchangePool/removeExchangePool emit events correctly", async function () {
		const addResult = await this.tokenManager.addExchangePool(this.pool.address)
		const addResultReceipt = await addResult.wait()
		expect(
			addResultReceipt.events.filter(
				(e) =>
					e.event === "ExchangePoolAdded" && e.args[0] === this.pool.address
			).length > 0,
			"No event for addExchangePool"
		)
		const removeResult = await this.tokenManager.removeExchangePool(
			this.pool.address
		)
		const removeResultreceipt = await removeResult.wait()
		expect(
			removeResultreceipt.events.filter(
				(e) =>
					e.event === "ExchangePoolRemoved" && e.args[0] === this.pool.address
			).length > 0,
			"No event for removeExchangePool"
		)
	})

	it("addExchangePool/removeExchangePool does not emit events for already added or not added pool", async function () {
		await this.tokenManager.addExchangePool(this.pool.address)
		const doubleAddResult = await this.tokenManager.addExchangePool(
			this.pool.address
		)
		const doubleAddResultReceipt = await doubleAddResult.wait()
		expect(
			doubleAddResultReceipt.events.length === 0,
			"Should be no event for double add"
		)
		await this.tokenManager.removeExchangePool(this.pool.address)
		const doubleRemoveResult = await this.tokenManager.removeExchangePool(
			this.pool.address
		)
		const doubleRemoveResultReceipt = await doubleRemoveResult.wait()
		expect(
			doubleRemoveResultReceipt.events.length === 0,
			"Should be no event for double remove"
		)
	})

	it("setPrimaryPool revert for forbidden user, non pool address or already primary pool and emit event for happy path", async function () {
		const _tokenManager = this.tokenManager.connect(this.tester)
		await expectRevert(
			_tokenManager.setPrimaryPool(this.pool.address),
			"Ownable: caller is not the owner"
		)
		await this.tokenManager.addExchangePool(this.pool.address)
		await expectRevert(
			this.tokenManager.setPrimaryPool(this.tester.address),
			"Not registered as exchange pool"
		)
		const setPoolResult = await this.tokenManager.setPrimaryPool(
			this.pool.address
		)
		const setPoolResultReceipt = await setPoolResult.wait()
		expect(
			setPoolResultReceipt.events.filter(
				(e) =>
					e.event === "PrimaryPoolUpdated" && e.args[1] === this.pool.address
			).length > 0,
			"No event for setPrimaryPool"
		)
		await expectRevert(
			this.tokenManager.setPrimaryPool(this.pool.address),
			"Already primary pool address"
		)
	})

	it("should revert if trying to add liquidity without approve tokens", async function () {
		const _tokenManager = this.tokenManager.connect(this.owner)
		const excessAmount = ethers.utils.parseEther("1000000000")
		await expectRevert(
			_tokenManager.addLiquidity(excessAmount),
			"ERC20: insufficient allowance"
		)
	})

	it("should revert if non-owner tries to call addLiquidity", async function () {
		const _tokenManager = this.tokenManager.connect(this.tester)
		const amount = ethers.utils.parseEther("1")
		await expectRevert(
			_tokenManager.addLiquidity(amount),
			"Ownable: caller is not the owner"
		)
	})

	it("addLiquidity set primaryPool correctly", async function () {
		const amount = ethers.utils.parseEther("100000000")
		const ethAmount = ethers.utils.parseEther("10")
		await this.token.approve(this.tokenManager.address, amount)
		const addLiquidityResult = await this.tokenManager.addLiquidity(amount, {
			value: ethAmount
		})
		const addLiquidityResultReceipt = await addLiquidityResult.wait()
		expect(
			addLiquidityResultReceipt.events.filter(
				(e) => e.event === "PrimaryPoolUpdated"
			).length > 0,
			"No event for PrimaryPoolUpdated"
		)
	})
})
