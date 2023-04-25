const csv = require('csv-parser')
const fs = require("fs")
const hre = require("hardhat");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const loadHolders = async () => {
    const holders = []
    const promise = new Promise((resolve) => {
        fs.createReadStream("data/migrations/goerli_starlink_holders.csv")
          .pipe(csv())
          .on("data", (item) => {
            holders.push(item);
          })
          .on("end", async () => {
            resolve(holders)
          })
    })
    return promise
}

const constructMerkleTree = async () => {
    const holders = await loadHolders()
    const nonZeroHolders = holders.map(h => {
      let hstr = h['HolderAddress']
      const hb = h['Balance'].toLowerCase()
      let hbal = hb.includes("e+") ? parseFloat(hb.split("e+")[0] + 'e+' + (parseInt(hb.split("e+")[1])-18)).toFixed() : parseFloat(hb).toFixed()
      return {address: hstr.toLowerCase(), amount: parseInt(hbal)}
    }).filter(h => h.amount > 0)
    
    console.log("nonZeroHolders " + nonZeroHolders.length);
    const bodyData = JSON.stringify({holders: nonZeroHolders})
    return fetch("https://dev-api.starlproject.com/migration/upload-snapshot", {
      method: "POST",
      headers: {
        "Authorization": "API_KEY bdhQexg73961NfudreNlp36Xhr8WqnM",
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyData),
      },
      body: bodyData
    }, 100000).then((r) => r.json()).then(d => {
      console.log("Successfully uploaded: " + JSON.stringify(d));
      return d.root_hash;
    })
}

const mainnetAddresses = require('../addresses/mainnet.json');
const goerliAddresses = require('../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
let merkleRoot = '0xbd76578c916b8a81fa8292ee234dd5edb4cfd387b5c2bca98cb15cb8ec276770';

async function main() {
  if (!merkleRoot) {
    merkleRoot = await constructMerkleTree();
    console.log("merkleRoot: " + merkleRoot);
  }

  const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
  const nftLevels = [8, 4, 2, 1];
  
  const WarpedTokenManager = await hre.ethers.getContractFactory("WarpedTokenManager");
  // set migration start timestamp as 5 mins later for dev
  const swapStartTimestamp = Math.floor(new Date(new Date().getTime() + 5*60*1000).getTime()/1000);
  console.log("swapStartTimestamp: ", swapStartTimestamp);
  const manager = await WarpedTokenManager.deploy(
    addresses.STARL_ADDRESS,
    merkleRoot,
    addresses.REWARD_VAULT_ADDRESS,
    addresses.DAO_VAULT_ADDRESS,
    addresses.TAX_WALLET,
    swapStartTimestamp,
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