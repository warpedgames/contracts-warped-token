const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    // update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x16D6191DA9780228D0B05465177aF751276F30eC",
    // update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x3Bb22454C326191DbF31837E4399F733F32a6Cd6",
    addresses.REWARD_VAULT_ADDRESS,
    addresses.WARPED_TREASURY_ADDRESS
];