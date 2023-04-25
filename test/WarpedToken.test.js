const { ethers } = require("hardhat");
const { expect } = require('chai');
const {
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const BN = ethers.BigNumber;


describe('WarpedToken', function () {
    before(async function () {
      this.WarpedToken = await ethers.getContractFactory('WarpedToken');
      this.TaxHandlerStub = await ethers.getContractFactory('TaxHandlerStub');
      this.TreasuryHandlerStub = await ethers.getContractFactory('TreasuryHandlerStub');
      const [owner, user, tester, pool, vault, daoVault] = await ethers.getSigners();
      this.owner = owner;
      this.user = user;
      this.tester = tester;
      this.pool = pool;
      this.vault = vault;
      this.daoVault = daoVault;
    });

    beforeEach(async function() {
        this.treasuryHandler = await this.TreasuryHandlerStub.deploy();
        await this.treasuryHandler.deployed();
        this.taxHandler = await this.TaxHandlerStub.deploy();
        await this.taxHandler.deployed();
        this.token = await this.WarpedToken.deploy(this.taxHandler.address, this.treasuryHandler.address, this.vault.address, this.daoVault.address);
        await this.token.deployed();
        await this.treasuryHandler.setTokenAndPool(this.token.address, this.pool.address);
    });
    
    it("updateRewardVault reverts for non-vault address or zero address update", async function() {
        await expectRevert(
            this.token.updateRewardVault(this.tester.address),
            'Not allowed'
        );
        const _token = this.token.connect(this.vault);
        await expectRevert(
            _token.updateRewardVault(constants.ZERO_ADDRESS),
            'Null address'
        );
    });
    
    it("updateRewardVault updates vault address correctly", async function() {
        const _token = this.token.connect(this.vault);
        await _token.updateRewardVault(this.tester.address);
        expect(await _token.rewardVault()).to.equal(this.tester.address);

        const testAmount = ethers.utils.parseEther("100");
        this.taxHandler.setTestData(testAmount, testAmount, testAmount);
        // expect updated reward vault address recieve testAmount tokens
        expect(() => this.token.transfer(this.user.address, ethers.utils.parseEther("100000")))
        .to.changeTokenBalance(this.token, this.tester, testAmount);
    });

    it("mint tokens doesn't transfer reward", async function() {
        expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(BN.from(0));
        expect(await this.token.balanceOf(this.vault.address)).to.equal(BN.from(0));
        expect(await this.token.totalSupply()).to.equal(ethers.utils.parseEther("1000000000"));
    });

    it("sending tax, reward and burn are working correctly", async function() {
        const taxAmount = ethers.utils.parseEther("1000");
        const gameRewardAmount = ethers.utils.parseEther("200");
        const daoRewardAmount = ethers.utils.parseEther("100");
        await this.taxHandler.setTestData(taxAmount, gameRewardAmount, daoRewardAmount);
        await this.token.transfer(this.user.address, ethers.utils.parseEther("5000"));
        expect(await this.token.balanceOf(this.treasuryHandler.address)).to.equal(taxAmount);
        expect(await this.token.balanceOf(this.vault.address)).to.equal(gameRewardAmount);
        expect(await this.token.balanceOf(this.daoVault.address)).to.equal(daoRewardAmount);
    });

    it("token transfer call treasuryHandler only 1 time", async function() {
        await this.token.transfer(this.user.address, ethers.utils.parseEther("5000"));
        expect(await this.treasuryHandler.calledTime()).to.equal(BN.from(1));
    });
});