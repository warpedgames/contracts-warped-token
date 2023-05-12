# WARPED Token

## Technologies used:

### Buy/Sell Tax

- Use UniswapV2Router to swap tokens collected in treasury contract as buy/sell tax
- Add liquidity(20% as default): 10% token and 10% of swapped ETH
- Transfer left ETH into team multsig wallet
- Buy/sell tax rate will be calculated dynamicly by checking buyer/sellers's ownership for ERC721 NFTs

### Usage of third party dependencies

TODO

### Openzeppelin for contracts

`@openzeppelin/contracts/token/ERC20/ERC20.sol`


### Hardhat for deploy and test

# Development environment

## Install

copy .env.example as .env and set private key and etherscan api key with your own and install node packages.

`
yarn
`

## Test

`
yarn test
`

## Build docs

`
yarn docs
`

## Deploy

`
yarn deploy:testnet
`

or 

`
yarn deploy:mainnet
`

## Verify

Update tokenManager.js, token.js, and taxHandler.js files in scripts/verify/args folder according to the log of the above deploy script. Also, update package.json script params.

`
yarn verify:WarpedTaxHandler
`

`
yarn verify:WarpedToken
`

`
yarn verify:WarpedTaxHandler
`

`
yarn verify:WarpedTreasuryHandler
`


# System architecture and internal/external interactions


