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
	"0xABDe659338d33252978CA1B108604E97743B0Ffe"

// update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
const WarpedTaxHandlerContractAddress =
	"0x556885475e87F4FA1c1Ad1ABE28bFA2EF57659E3"

// update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script

const WarpedTreasuryHandlerContractAddress =
	"0x29D27c8f565B8e406C678FF6d1d7Cbb4Dd0B31E1"

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
