const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    // update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x7430F55FabD318fe4a4861557a98E67c55180139",
    // update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script
    "0xd57000F986DA0AF0420CB5709a4A3F00Dd472D85",
    addresses.REWARD_VAULT_ADDRESS,
    addresses.WARPED_TREASURY_ADDRESS
];