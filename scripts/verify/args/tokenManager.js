
const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
const merkleRoot = '0xbd76578c916b8a81fa8292ee234dd5edb4cfd387b5c2bca98cb15cb8ec276770';
const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
const nftLevels = [8, 4, 2, 1];
// update this value from the log of token manager contract deployment
const swapStartTimestamp = 1679638234;

module.exports = [
    addresses.STARL_ADDRESS,
    merkleRoot,
    addresses.REWARD_VAULT_ADDRESS,
    addresses.WARPED_TREASURY_ADDRESS,
    addresses.TAX_WALLET,
    swapStartTimestamp,
    nftContracts,
    nftLevels
]