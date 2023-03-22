const { ethers } = require("hardhat");
const { expect } = require('chai');
const {
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const BN = ethers.BigNumber;
const uniswapRouterAbi = require('./migrations/abis/uniswapRouterAbi.json');
const uniswapFactoryAbi = require('./migrations/abis/uniswapFactoryAbi.json');

const getCurrentTime = async () => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    // console.log("block: " + blockNumBefore + " : " + timestampBefore);
    return timestampBefore;
};

const goerliAddresses = require('../addresses/goerli.json');
const addresses = goerliAddresses;
let merkleRoot = '0xbd76578c916b8a81fa8292ee234dd5edb4cfd387b5c2bca98cb15cb8ec276770';
const nftContracts = [addresses.SATE_NFT_ADDRESS, addresses.LMVX_NFT_ADDRESS, addresses.STPAL_NFT_ADDRESS, addresses.STPN_NFT_ADDRESS];
const nftLevels = [8, 4, 2, 1];

describe('StarlMigrator', function () {
    before(async function () {
      this.StarlMigrator = await ethers.getContractFactory('StarlMigrator');
      const [owner, user, tester, pool, vault, taxWallet] = await ethers.getSigners();
      this.owner = owner;
      this.user = user;
      this.tester = tester;
      this.pool = pool;
      this.vault = vault;
      this.taxWallet = taxWallet;
      this.proofForTest = ["0x1384c4c42f51f23246767f49ee20fdc8a5ac1da2d7a1932306dcc2a5ed7692ab","0xf63452c73102f2aacbbb9688b5d53f76c0898a59fd3bf678884deb1e62bfc07d","0x7d1e7ec6188e0027d943d067bfb0469e36d82a38eaee30823c29e2206174d3fa","0xdc817773ea24c3562fe798068200ae48e29440c4dac63b01325164fb76edb982","0x1977cfb647bb65456cf2795b3140fbc109d7bd6f57c813ee8816abbe98b06f24","0x0023fc30e3671154c2583c54a16125176f87be34b67736348838b2ee90ff14f9"];
      this.validUser = await ethers.getImpersonatedSigner('0x42ed619fdb869d411f9e10befd2df4e3460c280f');
      this.validUserOldTokenMaxAmount = ethers.utils.parseEther('18000000000');
    });

    beforeEach(async function() {
        const migrationStartTimestamp = await getCurrentTime() + 1;
        console.log("migration ts: " + migrationStartTimestamp);
        this.migrator = await this.StarlMigrator.deploy(
            addresses.STARL_ADDRESS,
            merkleRoot,
            this.vault.address,
            this.taxWallet.address,
            migrationStartTimestamp,
            nftContracts,
            nftLevels
        );
        await this.migrator.deployed();
        
        const tokenAddress = await this.migrator.starlV2();
        this.starlTokenAbi = require('../artifacts/contracts/StarlToken.sol/StarlToken.json').abi;
        this.token = await ethers.getContractAt(this.starlTokenAbi, tokenAddress);
        this.oldToken = await ethers.getContractAt(this.starlTokenAbi, addresses.STARL_ADDRESS);
    });
    
    it("constructor create contracts successfully", async function() {
        const token = this.token;
        expect(await token.totalSupply()).to.equal(ethers.utils.parseEther("1000000000"));
        expect(await this.migrator.migrationRatio()).to.equal(BN.from(10000));
        expect(await token.rewardVault()).to.equal(this.vault.address);

        const taxHandlerAddress = await token.taxHandler();
        const starlTokenAbi = require('../artifacts/contracts/StarlTaxHandler.sol/StarlTaxHandler.json').abi;
        const taxHandler = await ethers.getContractAt(starlTokenAbi, taxHandlerAddress);
        const starlTreasuryAbi = require('../artifacts/contracts/StarlTreasuryHandler.sol/StarlTreasuryHandler.json').abi;
        const treasuryHandlerAddress = await token.treasuryHandler();
        const treasuryHandler = await ethers.getContractAt(starlTreasuryAbi, treasuryHandlerAddress);
        expect(await taxHandler.owner()).to.equal(this.owner.address);
        expect(await treasuryHandler.owner()).to.equal(this.owner.address);
        expect(await treasuryHandler.token()).to.equal(token.address);
        expect(await treasuryHandler.treasury()).to.equal(this.taxWallet.address);

        // expect(await taxHandler.nftContracts()).to.equal(nftContracts);
        nftContracts.forEach(async (addr, idx) => {
            expect(await taxHandler.nftLevels(addr)).to.equal(nftLevels[idx]);
        });
    });

    it("closeMigration reverts for forbidden user or when already closed", async function() {
        const _migrator = this.migrator.connect(this.tester);
        await expectRevert(_migrator.closeMigration(), 'Ownable: caller is not the owner');
        await this.migrator.closeMigration();
        await expectRevert(this.migrator.closeMigration(), 'Migration not opened');
    });

    it("migrate reverts for invalid proof and invalid amount", async function() {
        let _migrator = this.migrator.connect(this.tester);
        await expectRevert(_migrator.migrate([constants.ZERO_BYTES32], BN.from(1), BN.from(1)), 'Merkle proof invalid');

        _migrator = this.migrator.connect(this.validUser);
        await expectRevert(_migrator.migrate(this.proofForTest, ethers.utils.parseEther('1000'), ethers.utils.parseEther('1000')), 'Merkle proof invalid');
    });

    it("migrate reverts after closed or more than max amount", async function() {
        const _migrator = this.migrator.connect(this.validUser);
        await expectRevert(_migrator.migrate(this.proofForTest, this.validUserOldTokenMaxAmount, this.validUserOldTokenMaxAmount.add(1)), 'Exceed max amount');

        await this.migrator.closeMigration();
        await expectRevert(_migrator.migrate(this.proofForTest, this.validUserOldTokenMaxAmount, ethers.utils.parseEther('1000')), 'Migration not opened');
    });

    it("migrateAll success for valid proof and max amount", async function() {
        const _migrator = this.migrator.connect(this.validUser);
        const _oldToken = this.oldToken.connect(this.validUser);
        // approve old token spend for migrator contract
        await _oldToken.approve(_migrator.address, this.validUserOldTokenMaxAmount);
        await _migrator.migrateAll(this.proofForTest, this.validUserOldTokenMaxAmount);
        // check if migrator received old token correctly
        expect(await _oldToken.balanceOf(this.migrator.address)).to.equal(this.validUserOldTokenMaxAmount);
        // check received amount is 10k
        expect(await this.token.balanceOf(this.validUser.address)).to.equal(this.validUserOldTokenMaxAmount.div(BN.from(10000)));
        // withdraw all
        await expect(() => this.migrator.withdrawAll()).to.changeTokenBalance(this.oldToken, this.owner, this.validUserOldTokenMaxAmount);
    });

    it("migrate success for valid proof and max amount", async function() {
        const _migrator = this.migrator.connect(this.validUser);
        // try to migrate 100M tokens
        const migrateAmount = ethers.utils.parseEther('100000000');
        const _oldToken = this.oldToken.connect(this.validUser);
        // approve old token spend for migrator contract
        await _oldToken.approve(_migrator.address, migrateAmount);
        // migrate
        await _migrator.migrate(this.proofForTest, this.validUserOldTokenMaxAmount, migrateAmount);
        // check if migrator received old token correctly
        expect(await _oldToken.balanceOf(this.migrator.address)).to.equal(migrateAmount);
        // check received amount is 10k
        expect(await this.token.balanceOf(this.validUser.address)).to.equal(migrateAmount.div(BN.from(10000)));
        // withdraw all
        await expect(() => this.migrator.withdrawAll()).to.changeTokenBalance(this.oldToken, this.owner, migrateAmount);
    });

    it("withdrawAll revert for forbidden user", async function() {
        const _migrator = this.migrator.connect(this.validUser);
        await expectRevert(_migrator.withdrawAll(), 'Ownable: caller is not the owner');
    });

    it("addExchangePool/removeExchangePool reverts for forbidden user", async function() {
        const _migrator = this.migrator.connect(this.tester);
        await expectRevert(_migrator.addExchangePool(this.tester.address), 'Ownable: caller is not the owner');
        await expectRevert(_migrator.removeExchangePool(this.tester.address), 'Ownable: caller is not the owner');
    });
});