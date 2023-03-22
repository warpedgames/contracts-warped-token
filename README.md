# STARL Token Migration Contracts Documentation

# Used technologies:

Refer this flow: https://miro.com/app/board/uXjVPkKbfEw=/

## Merkle Proof in Migration

Use merkle proof to verify migrator's address and amount of tokens.

- Build merkle tree from old token holder's addresses and balances
- Store merkle tree root hash in Migrator contract
- Get user's proof using backend REST API and pass into migrate function
- Verify proof and amount of tokens using root hash

## Buy/Sell Tax

- Use UniswapV2Router to swap tokens collected in treasury contract as buy/sell tax
- Add liquidity(20% as default): 10% token and 10% of swapped ETH
- Transfer left ETH into team multsig wallet
- Buy/sell tax rate will be calculated dynamicly by checking migrator's ownership for ERC721 NFTs

# Usage of third party dependencies

## Openzeppelin for contracts

@openzeppelin/contracts/token/ERC20/ERC20.sol

@openzeppelin/contracts/utils/cryptography/MerkleProof.sol

## Hardhat for deploy and test

# Development environment

# Deploy script

`
npx hardhat run scripts/migrations/deploy.js --network goerli
`

# Test script

`
npx hardhat coverage --testfiles ./test/*.test.js
`

# System architecture and internal/external interactions

Refer this flow: https://miro.com/app/board/uXjVPkKbfEw=/

## Integration with Backend REST API

POST migration/upload-snapshot

GET migration/get-proof/:address

## Integration with UI

https://marketplace.starlproject.com/migration
