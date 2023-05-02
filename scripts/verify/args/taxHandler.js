
const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STLM_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
const nftLevels = [8, 4, 4, 2, 1];

module.exports = [
    // update this with deployed WarpedTokenManager contract address
    "0xD3c4F635eaaed526A9f26fa252a24e3Bd48BE4b9",
    nftContracts,
    nftLevels
]