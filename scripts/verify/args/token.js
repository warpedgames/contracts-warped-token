const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    // update this with WarpedTaxHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x556885475e87F4FA1c1Ad1ABE28bFA2EF57659E3",
    // update this with WarpedTreasuryHandler contract address from the log of WarpedTokenManager contract deploy script
    "0x29D27c8f565B8e406C678FF6d1d7Cbb4Dd0B31E1"
];