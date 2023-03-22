## STARLINK Pixelnauts contract

## Config

Create .env file in root directory and write following:

PRIVATE_KEY=[your private key]

ETHERSCAN_API_KEY=[your etherscan api key]

## Install

npm install

## Test

rinkeby

npx hardhat run --network rinkeby scripts/deploy_pixel_nauts.js

Deployed StarlPixleNauts Address: <delpyed_stpn_address>

npx hardhat verify --network rinkeby <delpyed_stpn_address> --constructor-args scripts/pixel_nauts_params.js

## Reveal

Reveal the PixelNauts with this uri:

https://starlink.mypinata.cloud/ipfs/QmfCZMkMxSSK6xLSTgZQD5HobKsR1CsAxKa3ynNrbrJmWE/

## Deploy NFT Staking contract

npx hardhat run --network rinkeby scripts/deploy_nft_staking.js

# Set tiers

npx hardhat run --network rinkeby scripts/nft_staking_tiers.js

## Deploy AMxST contract

Add following values to .env file for fee recipients:

DEV_FEE_RECIPIENT=[0x...] \
AMOEBA_RECIPIENT=[0x...] \
FIRST_ARTIST_RECIPIENT=[0x...] \
SECOND_ARTIST_RECIPIENT=[0x...]

Get sale launch timestamp(should be later than current timestamp) and update in following 2 files:

- use --network mainnet for mainnet deployment.

scripts\deploy_amxst.js line#13 \
scripts\args\amxst_constructor.js line#8

command: \
npx hardhat run scripts/deploy_amxst.js --network rinkeby \
output: \
AmoebaXStarl: [AMXST_CONTRACT_ADDRESS]

npx hardhat verify [AMXST_CONTRACT_ADDRESS] --network rinkeby --constructor-args scripts/args/amxst_constructor.js

## Future usage of AMxST contract

In the future, we can add more nft collections of artists by using following functions:

```
addArtist(
    uint256 supply, \\ total supply of nfts in this artist collection
    uint256 launchTime, \\ launch time of sale for these nfts
    address feeRecipient, \\ address where receive artist payment
    string memory baseUrl, \\ base ipfs url of metadata of these nfts
    string memory extension \\ extension, usually .json
)

batchAddArtists(
    uint256[] calldata supplies, \\ list of supply
    uint256 launchTime, \\ launch time of the sale
    address[] calldata feeRecipients, \\ list of feeRecipient address
    string[] calldata baseUrls, \\ list of baseUrl
    string[] calldata extensions \\ list of extension
)

updateFeePercent(
    uint256 _devFeePercent, \\ this is 10% now, but can update later
    uint256 _artistFeePercent, \\ this is 30% now, but can update later
)
```

You can write to these functions using etherscan.io or rinkeby.etherscan.io.

## STARLPAL contract

npx hardhat run scripts\deploy_starl_pal.js --network rinkeby

npx hardhat verify 0x113B123d48D8621e6Ff6c3177f5890890faEa785 --constructor-args scripts\args\starl_pal.js --network rinkeby
