const {
	WarpedTaxHandlerContractAddress,
	WarpedTreasuryHandlerContractAddress
} = require("../../../config/index")
require("dotenv").config()

module.exports = [
	process.env.DEPLOYER_WALLET,
	WarpedTaxHandlerContractAddress,
	WarpedTreasuryHandlerContractAddress
]
