const { ethers } = require('hardhat')
const { expect } = require('chai')
const {
	constants, // Common constants, like the zero address and largest integers
	expectEvent, // Assertions for emitted events
	expectRevert // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers')
const BN = ethers.BigNumber

const goerliAddresses = require('../addresses/goerli.json')
const addresses = goerliAddresses
const nftContracts = [
	addresses.SATE_NFT_ADDRESS,
	addresses.LMVX_NFT_ADDRESS,
	addresses.STPAL_NFT_ADDRESS,
	addresses.STPN_NFT_ADDRESS
]
const nftLevels = [8, 4, 2, 1]

describe('WarpedTokenManager', function () {
	before(async function () {
		this.WarpedTokenManager = await ethers.getContractFactory(
			'WarpedTokenManager'
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
			'0x42ed619fdb869d411f9e10befd2df4e3460c280f'
		)
		this.validUserOldTokenMaxAmount = ethers.utils.parseEther('18000000000')
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
			require('../artifacts/contracts/WarpedToken.sol/WarpedToken.json').abi
		this.token = await ethers.getContractAt(this.warpedTokenAbi, tokenAddress)
	})

	it('constructor create contracts successfully', async function () {
		const token = this.token
		expect(await token.totalSupply()).to.equal(
			ethers.utils.parseEther('10000000000')
		)

		const taxHandlerAddress = await token.taxHandler()
		const warpedTaxHandlerAbi =
			require('../artifacts/contracts/WarpedTaxHandler.sol/WarpedTaxHandler.json').abi
		const taxHandler = await ethers.getContractAt(
			warpedTaxHandlerAbi,
			taxHandlerAddress
		)
		const warpedTreasuryAbi =
			require('../artifacts/contracts/WarpedTreasuryHandler.sol/WarpedTreasuryHandler.json').abi
		const treasuryHandlerAddress = await token.treasuryHandler()
		const treasuryHandler = await ethers.getContractAt(
			warpedTreasuryAbi,
			treasuryHandlerAddress
		)
		expect(await taxHandler.owner()).to.equal(this.owner.address)
		expect(await treasuryHandler.owner()).to.equal(this.owner.address)
		expect(await treasuryHandler.token()).to.equal(token.address)
		expect(await treasuryHandler.treasury()).to.equal(this.taxWallet.address)

		// expect(await taxHandler.nftContracts()).to.equal(nftContracts);
		nftContracts.forEach(async (addr, idx) => {
			expect(await taxHandler.nftLevels(addr)).to.equal(nftLevels[idx])
		})
	})

	it('addExchangePool/removeExchangePool reverts for forbidden user', async function () {
		const _tokenManager = this.tokenManager.connect(this.tester)
		await expectRevert(
			_tokenManager.addExchangePool(this.tester.address),
			'Ownable: caller is not the owner'
		)
		await expectRevert(
			_tokenManager.removeExchangePool(this.tester.address),
			'Ownable: caller is not the owner'
		)
	})
})
