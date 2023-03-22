
const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
const merkleRoot = '0x76579fa9c53414e8f6625c4bd52d0f5365bbac7b3752c735ff7b01237d1d55fe';
const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
const nftLevels = [4, 2, 1, 1];
const migrationStartTimestamp = 1679306127;

module.exports = [
    addresses.STARL_ADDRESS,
    merkleRoot,
    addresses.REWARD_VAULT_ADDRESS,
    addresses.TAX_WALLET,
    nftContracts,
    nftLevels,
    migrationStartTimestamp
]