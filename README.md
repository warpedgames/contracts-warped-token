# WARPED Token Contracts Documentation

# Used technologies:

Refer this flow: https://miro.com/app/board/uXjVPkKbfEw=/

## Buy/Sell Tax

- Use UniswapV2Router to swap tokens collected in treasury contract as buy/sell tax
- Add liquidity(20% as default): 10% token and 10% of swapped ETH
- Transfer left ETH into team multsig wallet
- Buy/sell tax rate will be calculated dynamicly by checking buyer/sellers's ownership for ERC721 NFTs

# Usage of third party dependencies

## Openzeppelin for contracts

@openzeppelin/contracts/token/ERC20/ERC20.sol

## Hardhat for deploy and test

# Development environment

## Install

copy .env.example as .env and set private key and etherscan api key with your own and install node packages.

`
yarn
`

or 

`
npm install
`

## Deploy script

`
npx hardhat run scripts/deploy.js --network goerli
`

## Verify script

Please update tokenManager.js, token.js, and taxHandler.js files in scripts/verify/args folder according to the log of the above deploy script.

`
npx hardhat verify [address of deployed WarpedTokenManager contract] --network goerli --constructor-args ./scripts/verify/args/tokenManager.js
`

`
npx hardhat verify [address of deployed WarpedToken contract(find from the log of above deploy script)] --network goerli --constructor-args ./scripts/verify/args/token.js
`

`
npx hardhat verify [address of deployed WarpedTaxHandler contract(find from the log of above deploy script)] --network goerli --constructor-args ./scripts/verify/args/taxHandler.js
`

`
npx hardhat verify [address of deployed WarpedTreasuryHandler contract(find from the log of above deploy script)] --network goerli [WarpedTokenManager contract address]
`

## Test script

`
npx hardhat coverage --testfiles ./test/*.test.js
`

# System architecture and internal/external interactions

Refer this flow: https://miro.com/app/board/uXjVPkKbfEw=/

https://docs.google.com/document/d/1WIrTMQDE6s8A5djIkVnxEKhuxmIJ9bKO45B-l0sGmcI
