require("@nomiclabs/hardhat-waffle")
require("hardhat-deploy")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("solidity-docgen")
require("@nomiclabs/hardhat-ethers")
require("solidity-coverage")
require("@nomiclabs/hardhat-truffle5")
require("hardhat-gas-reporter")

/// ENVVAR
// - CI:                output gas report to file instead of stdout
// - COVERAGE:          enable coverage report
// - ENABLE_GAS_REPORT: enable gas report
// - COMPILE_MODE:      production modes enables optimizations (default: development)
// - COMPILE_VERSION:   compiler version (default: 0.8.9)
// - COINMARKETCAP:     coinmarkercat api key for USD value in gas report

const fs = require("fs")
const path = require("path")
const argv = require("yargs/yargs")()
	.env("")
	.options({
		coverage: {
			type: "boolean",
			default: false
		},
		gas: {
			alias: "enableGasReport",
			type: "boolean",
			default: false
		},
		gasReport: {
			alias: "enableGasReportPath",
			type: "string",
			implies: "gas",
			default: undefined
		},
		mode: {
			alias: "compileMode",
			type: "string",
			choices: ["production", "development"],
			default: "development"
		},
		ir: {
			alias: "enableIR",
			type: "boolean",
			default: false
		},
		compiler: {
			alias: "compileVersion",
			type: "string",
			default: "0.8.13"
		},
		coinmarketcap: {
			alias: "coinmarketcapApiKey",
			type: "string"
		}
	}).argv

for (const f of fs.readdirSync(path.join(__dirname, "hardhat"))) {
	require(path.join(__dirname, "hardhat", f))
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	solidity: {
		version: "0.8.18",
		settings: {
			optimizer: {
				enabled: true,
				runs: 1000
			}
		}
	},
	allowUnlimitedContractSize: true,
	networks: {
		hardhat: {
			forking: {
				url: "https://goerli.infura.io/v3/0035536bad544fc0a4868ddad5ed81f1",
				blockNumber: 8654260
			},
			chainId: 1337,
			gas: 2100000
		},
		goerli: {
			url: "https://goerli.infura.io/v3/3849a711ff6443d0b44b62f4156c7c0a",
			accounts: [process.env.PRIVATE_KEY]
		},
		mainnet: {
			url: "https://mainnet.infura.io/v3/3849a711ff6443d0b44b62f4156c7c0a",
			accounts: [process.env.PRIVATE_KEY]
		}
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY
	},
	namedAccounts: {
		deployer: {
			default: 0 // here this will by default take the first account as deployer
		}
	},
	docgen: {},
	initialBaseFeePerGas: 0,
	gasReporter: {
		showMethodSig: true,
		currency: "USD",
		outputFile: argv.gasReport,
		coinmarketcap: argv.coinmarketcap
	}
}
