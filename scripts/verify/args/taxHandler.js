
const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
const nftLevels = [8, 4, 2, 1];

module.exports = [
    // update this with deployed WarpedTokenManager contract address
    "0xaA2db171656DAfe3dF4BD05e9EBed70000A7a9d8",
    nftContracts,
    nftLevels
]