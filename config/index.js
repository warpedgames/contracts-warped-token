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
	"0x71d2811a110169D1e933899872Ff79D9E95Eb15C"

// update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
const WarpedTaxHandlerContractAddress =
	"0x3d0dcB983eE33aE388663554A188662Bd6495325"

// update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script

const WarpedTreasuryHandlerContractAddress =
	"0xE32D385079346CE346E360841CA307c46389F447"

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
