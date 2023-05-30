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
	"0x59d566b9997f2E9cD9C68CF8b1E0f506Ac8BC122"

// update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
const WarpedTaxHandlerContractAddress =
	"0x580678ed8329B203E62c38Dc7E1fB871DFd781d9"

// update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script

const WarpedTreasuryHandlerContractAddress =
	"0x35657767De26c3a48Ac221EA6658b158B4D53300"

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
