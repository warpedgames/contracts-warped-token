require("@nomiclabs/hardhat-waffle")
require("hardhat-deploy")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("solidity-docgen")
require("@nomiclabs/hardhat-ethers")
require("solidity-coverage")
require("@nomiclabs/hardhat-truffle5")
require("hardhat-gas-reporter")

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
			chainId: 1337
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
		currency: "USD"
	}
}
