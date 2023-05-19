export const mainnetAddresses = require("../addresses/mainnet.json")
export const goerliAddresses = require("../addresses/goerli.json")

export const { addresses } = require("../config")

export const nftContracts = [
	addresses.SATE_NFT_ADDRESS,
	addresses.LMVX_NFT_ADDRESS,
	addresses.STLM_NFT_ADDRESS,
	addresses.STPAL_NFT_ADDRESS,
	addresses.STPN_NFT_ADDRESS
]

export const nftLevels = [8, 4, 4, 2, 1]

// update this with deployed WarpedTokenManager contract address
export const WarpedTokenManagerContractAddress =
	"0xABDe659338d33252978CA1B108604E97743B0Ffe"

// update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
export const WarpedTaxHandlerContractAddress =
	"0x556885475e87F4FA1c1Ad1ABE28bFA2EF57659E3"

// update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script

export const WarpedTreasuryHandlerContractAddress =
	"0x29D27c8f565B8e406C678FF6d1d7Cbb4Dd0B31E1"
