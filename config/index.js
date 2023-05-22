const mainnetAddresses = require("../addresses/mainnet.json")
const goerliAddresses = require("../addresses/goerli.json")

const addresses =
	process.env.NETWORK === "mainnet" ? mainnetAddresses : goerliAddresses

const nftContracts = [
	addresses.SATE_NFT_ADDRESS,
	addresses.LMVX_NFT_ADDRESS,
	addresses.STLM_NFT_ADDRESS,
	addresses.STPAL_NFT_ADDRESS,
	addresses.STPN_NFT_ADDRESS
]

const nftLevels = [8, 4, 4, 2, 1]

// update this with deployed WarpedTokenManager contract address
const WarpedTokenManagerContractAddress =
	"0xE7C67D7B2da9d6C0CFD35EEf9054cF5aDc04Db88"

// update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
const WarpedTaxHandlerContractAddress =
	"0x4674823378a388a89B1Bda1Da0B23689Db932c36"

// update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script

const WarpedTreasuryHandlerContractAddress =
	"0x2e5F95bF9c7BB876E4D44233593CB94A23A27F3D"

module.exports = {
	mainnetAddresses,
	goerliAddresses,
	addresses,
	nftContracts,
	nftLevels,
	WarpedTokenManagerContractAddress,
	WarpedTaxHandlerContractAddress,
	WarpedTreasuryHandlerContractAddress
}
