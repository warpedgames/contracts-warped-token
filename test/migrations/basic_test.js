const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const dotenv = require("dotenv");
const erc20Abi = require("./abis/erc20Abi.json");
const uniswapRouterAbi = require("./abis/uniswapRouterAbi.json");
const taxFeeCalcAbi = require("./abis/taxFeeCalcAbi.json");
const { BigNumber } = require("ethers");
const { addrs, proofs, snapshots } = require("./config");
const { loadMigrationContracts, roundPercent } = require("./helper");
dotenv.config();

const getCurrentTime = async () => {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  const timestampBefore = blockBefore.timestamp;
  // console.log("block: " + blockNumBefore + " : " + timestampBefore);
  return timestampBefore;
};

describe("Migration contract", function () {

  it("Test migration", async function () {
    // 1. Load contracts and signers from network
    const { starlMigrator, token, oldToken, owner, tester } = await loadFixture(loadMigrationContracts);

    // 2. Migrate old token into new token using tester account
    let _migrator = starlMigrator.connect(tester);
    const _maxAmount = ethers.utils.parseEther(snapshots.maxAmounts[tester.address]);
    const _migrateAmount = ethers.utils.parseEther("150000");

    const _oldToken = oldToken.connect(tester);
    await _oldToken.approve(_migrator.address, _maxAmount);
    await _migrator.migrate(proofs[tester.address], _maxAmount, _migrateAmount)

    // 3. Compare received new token amount
    expect(await token.balanceOf(tester.address)).to.equal(
      _migrateAmount.div(BigNumber.from(10000)),
      "Balance of migrated token is mismatched"
    );
    // 4. Compare received old token amount
    expect(await oldToken.balanceOf(_migrator.address)).to.equal(
      _migrateAmount,
      "Balance of received v1 token is mismatched"
    );

    // 5. Widthdraw received old token
    _migrator = starlMigrator.connect(owner);
    const _prevBalance = await oldToken.balanceOf(owner.address);
    _migrator = starlMigrator.connect(owner);
    await _migrator.withdrawAll();

    // 6. Compare withdrawn old token amount
    expect(await oldToken.balanceOf(owner.address)).to.equal(
      _migrateAmount.add(_prevBalance),
      "Balance of widthdrawn v1 token is mismatched"
    );
  }).timeout(100000);
});


describe("New token contract", function () {

  async function openTrading() {
    // 1. Load contracts and signers from network
    const { starlMigrator, token, oldToken, owner, tester2: tester } = await loadFixture(loadMigrationContracts);
    
    // 2. Migrate large amound of old tokens in owner account (in mainnet, this will be done by users and cex migration)
    let _migrator = starlMigrator.connect(owner);
    let _oldToken = oldToken.connect(owner);

    const _maxAmount = ethers.utils.parseEther(snapshots.maxAmounts[owner.address]);
    const _migrateAmount = ethers.utils.parseEther("500000000000");

    await _oldToken.approve(_migrator.address, _maxAmount);
    await _migrator.migrate(proofs[owner.address], _maxAmount, _migrateAmount);

    // 3. Withdraw old tokens
    _migrator = starlMigrator.connect(owner);
    await _migrator.withdrawAll();

    // 4. Open trading with 50 ethers and 10% supply in token contract (in mainnet, need to swap received old tokens into ETH)
    let _token = token.connect(owner);
    await _token.openTrading({value: ethers.utils.parseEther("50")});

    return {token, tester};
  }

  it("Test buy fee", async function () {
    // 1. Load contracts and signers from network
    const {token, tester} = await openTrading();

    // 2. Buy new tokens using uniswap router v2
    const uniswapRouter = await ethers.getContractAt(uniswapRouterAbi, "0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const _uniswapRouter = uniswapRouter.connect(tester);
    const curTime = await getCurrentTime();
    const wethAddr = await uniswapRouter.WETH();
    const res = await _uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("1"), [wethAddr, token.address], tester.address, curTime + 100, {
        value: ethers.utils.parseEther("1")
    });

    // 3. Compare received amount of new token
    const _tokenReceived = await token.balanceOf(tester.address);
    const _received = parseFloat(ethers.utils.formatEther(_tokenReceived));
    console.log("received tokens: " + _received);
    expect(_received).greaterThan(0, "Zero tokens received");

    // 4. Compare 3% tax amount and 1% reward amount
    const _taxAmount = await token.balanceOf(addrs.taxWallet);
    console.log("buy tax amount: " + parseFloat(ethers.utils.formatEther(_taxAmount)));
    const _rewardAmount = await token.balanceOf(addrs.gameVault);
    console.log("buy reward amount: " + parseFloat(ethers.utils.formatEther(_rewardAmount)));

    const _totalAmount = _tokenReceived.add(_taxAmount).add(_rewardAmount);
    const _taxFee = roundPercent(_taxAmount, _totalAmount);
    console.log("buy tax fee: " + _taxFee);
    const _rewardFee = roundPercent(_rewardAmount, _totalAmount);
    console.log("buy reward fee: " + _rewardFee);

    expect(_taxFee).eq(3, "Tax fee percentage mismatched");
    expect(_rewardFee).eq(1, "Reward fee percentage mismatched");

  }).timeout(200000);
  

  it("Test buy/sell fee", async function () {
    // 1. Load contracts and signers from network
    const {token, tester} = await openTrading();

    // 2. Buy new tokens using uniswap router v2
    const uniswapRouter = await ethers.getContractAt(uniswapRouterAbi, "0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const _uniswapRouter = uniswapRouter.connect(tester);
    const curTime = await getCurrentTime();
    const wethAddr = await uniswapRouter.WETH();
    const taxFeeCalc = await ethers.getContractAt(taxFeeCalcAbi, addrs.taxFeeCalc);
    const fee0 = await taxFeeCalc.calculateTaxFee(tester.address);
    console.log("possible fee of tester addr: " + fee0);
    const _rewardAmount0 = await token.balanceOf(addrs.gameVault);
    console.log("original reward vault amount: " + parseFloat(ethers.utils.formatEther(_rewardAmount0)));
    const res = await _uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("1"), [wethAddr, token.address], tester.address, curTime + 100, {
        value: ethers.utils.parseEther("1")
    });

    // 3. Compare received amount of new token
    const _tokenReceived = await token.balanceOf(tester.address);
    const _received = parseFloat(ethers.utils.formatEther(_tokenReceived));
    console.log("received tokens: " + _received);
    expect(_received).greaterThan(0, "Zero tokens received");

    // 4. Compare 3% tax amount and 1% reward amount
    const _taxAmount = await token.balanceOf(addrs.taxWallet);
    console.log("buy tax amount: " + parseFloat(ethers.utils.formatEther(_taxAmount)));
    const _rewardAmount = await token.balanceOf(addrs.gameVault);
    console.log("buy reward amount: " + parseFloat(ethers.utils.formatEther(_rewardAmount)));

    const _totalAmount = _tokenReceived.add(_taxAmount).add(_rewardAmount);
    const _taxFee = roundPercent(_taxAmount, _totalAmount);
    console.log("buy tax fee: " + _taxFee);
    const _rewardFee = roundPercent(_rewardAmount, _totalAmount);
    console.log("buy reward fee: " + _rewardFee);

    expect(_taxFee).eq(3, "Tax fee percentage mismatched");
    expect(_rewardFee).eq(1, "Reward fee percentage mismatched");


    const _burnAmount = await token.balanceOf(addrs.deadAddr);
    console.log("original amount in burn address: " + parseFloat(ethers.utils.formatEther(_burnAmount)));
    // 5. Sell token
    const _token = token.connect(tester);
    _token.approve(uniswapRouter.address, ethers.utils.parseEther("10000"));
    _uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("2000"), 0, [token.address, wethAddr], tester.address, curTime + 100
    );

    // 6. Compare 3% tax amount, 0% reward and 1% burn amount
    const _taxAmount2 = (await token.balanceOf(addrs.taxWallet)).sub(_taxAmount);
    console.log("sell tax amount: " + parseFloat(ethers.utils.formatEther(_taxAmount2)));
    const _rewardAmount2 = (await token.balanceOf(addrs.gameVault)).sub(_rewardAmount);
    console.log("sell reward amount: " + parseFloat(ethers.utils.formatEther(_rewardAmount2)));
    const _burnAmount2 = (await token.balanceOf(addrs.deadAddr)).sub(_burnAmount);
    console.log("sell burnt amount: " + parseFloat(ethers.utils.formatEther(_burnAmount2)));
    // Test zero percent reward
    expect(_rewardAmount2.toNumber()).eq(0, "Unexpected reward");

    const fee = await taxFeeCalc.calculateTaxFee(tester.address);
    console.log("possible fee of tester addr: " + fee);
    
    const _taxFee2 = roundPercent(_taxAmount2, ethers.utils.parseEther("2000"));
    console.log("sell tax fee: " + _taxFee2);
    const _burnFee2 = roundPercent(_burnAmount2, ethers.utils.parseEther("2000"));
    console.log("burnt percent: " + _burnFee2);
    // Test 3% tax and 1% burn
    expect(_taxFee2).eq(3, "Invalid tax fee");
    expect(_burnFee2).eq(1, "Invalid burnt fee");
  }).timeout(200000);
});
