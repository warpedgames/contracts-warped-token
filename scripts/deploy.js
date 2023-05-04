const hre = require("hardhat");

const mainnetAddresses = require('../addresses/mainnet.json');
const goerliAddresses = require('../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;

async function main() {

  const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STLM_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
  const nftLevels = [8, 4, 4, 2, 1];
  
  const WarpedTokenManager = await hre.ethers.getContractFactory("WarpedTokenManager");
  const manager = await WarpedTokenManager.deploy(
    addresses.REWARD_VAULT_ADDRESS,
    addresses.WARPED_TREASURY_ADDRESS,
    addresses.TAX_WALLET,
    nftContracts,
    nftLevels
  );
  await manager.deployed();
  console.log("WarpedTokenManager:", manager.address);

  const tokenAddress = await manager.warpedToken();
  const WarpedToken = await hre.ethers.getContractFactory("WarpedToken");
  const warpedToken = WarpedToken.attach(tokenAddress);
  console.log("WarpedToken: ", warpedToken.address);

  const taxHandler = await warpedToken.taxHandler();
  console.log("WarpedTaxHandler: ", taxHandler);
  const treasuryHandler = await warpedToken.treasuryHandler();  
  console.log("WarpedTreasuryHandler: ", treasuryHandler);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });