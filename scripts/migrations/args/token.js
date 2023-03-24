const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    "0x16D6191DA9780228D0B05465177aF751276F30eC",
    "0x3Bb22454C326191DbF31837E4399F733F32a6Cd6",
    addresses.REWARD_VAULT_ADDRESS
];