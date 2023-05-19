const hre = require("hardhat")

const { addresses, nftContracts, nftLevels } = require("../config/index")

async function main() {
	const WarpedTokenManager = await hre.ethers.getContractFactory(
		"WarpedTokenManager"
	)
	const manager = await WarpedTokenManager.deploy(
		addresses.TAX_WALLET,
		nftContracts,
		nftLevels
	)
	await manager.deployed()
	console.log("WarpedTokenManager:", manager.address)

	const tokenAddress = await manager.warpedToken()
	const WarpedToken = await hre.ethers.getContractFactory("WarpedToken")
	const warpedToken = WarpedToken.attach(tokenAddress)
	console.log("WarpedToken: ", warpedToken.address)

	const taxHandler = await warpedToken.taxHandler()
	console.log("WarpedTaxHandler: ", taxHandler)
	const treasuryHandler = await warpedToken.treasuryHandler()
	console.log("WarpedTreasuryHandler: ", treasuryHandler)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
