const mainnetAddresses = require('../../../addresses/mainnet.json');
const goerliAddresses = require('../../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

module.exports = [
    "0x95F5bB9C773AF550e2DeD06633Be16EFA588633D",
    "0x8Cf5C371Db352Ec7DdAB87D2F2672081B5DCb372",
    addresses.REWARD_VAULT_ADDRESS,
    "0xa2fdcc6fa16197f23df29571eaaa0fa769292135"
];