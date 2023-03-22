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
    return fetch("http://localhost:3001/migration/upload-snapshot", {
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

const mainnetAddresses = require('../../addresses/mainnet.json');
const goerliAddresses = require('../../addresses/goerli.json');
const addresses = process.env.NETWORK === 'mainnet' ? mainnetAddresses : goerliAddresses;
let merkleRoot = '0xbd76578c916b8a81fa8292ee234dd5edb4cfd387b5c2bca98cb15cb8ec276770';

async function main() {
  if (!merkleRoot) {
    merkleRoot = await constructMerkleTree();
    console.log("merkleRoot: " + merkleRoot);
  }

  const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
  const nftLevels = [8, 4, 2, 1];
  
  const StarlMigrator = await hre.ethers.getContractFactory("StarlMigrator");
  // set migration start timestamp as 5 mins later for dev
  const migrationStartTimestamp = Math.floor(new Date(new Date().getTime() + 5*60*1000).getTime()/1000);
  console.log("migrationStartTimestamp: ", migrationStartTimestamp);
  const migrator = await StarlMigrator.deploy(
    addresses.STARL_ADDRESS,
    merkleRoot,
    addresses.REWARD_VAULT_ADDRESS,
    addresses.TAX_WALLET,
    migrationStartTimestamp,
    nftContracts,
    nftLevels
  );
  await migrator.deployed();
  console.log("StarlMigrator:", migrator.address);

  const tokenAddress = await migrator.starlV2();
  const StarlToken = await hre.ethers.getContractFactory("StarlToken");
  const starlToken = StarlToken.attach(tokenAddress);
  console.log("StarlToken: ", starlToken.address);

  const taxHandler = await starlToken.taxHandler();
  console.log("TaxHandler: ", taxHandler);
  const treasuryHandler = await starlToken.treasuryHandler();  
  console.log("TreasuryHandler: ", treasuryHandler);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });