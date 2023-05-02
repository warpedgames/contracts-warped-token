const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    // update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x36dd16eE8Fc8587E03128651D59b0D3C5b66C46B",
    // update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x27b0708a714fE731E1a0D423Ca10ddE469cB2be8",
    addresses.REWARD_VAULT_ADDRESS,
    addresses.WARPED_TREASURY_ADDRESS
];