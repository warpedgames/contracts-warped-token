const { ethers } = require("hardhat");
const dotenv = require("dotenv");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { addrs } = require("./config");
dotenv.config();

async function loadMigrationContracts() {
    const owner = await ethers.getImpersonatedSigner(addrs.owner);
    const tester = await ethers.getImpersonatedSigner(addrs.tester);
    const tester2 = await ethers.getImpersonatedSigner(addrs.tester2);
    await helpers.setBalance(addrs.tester, ethers.utils.parseEther('100'));
    await helpers.setBalance(addrs.owner, ethers.utils.parseEther('100'));
    await helpers.setBalance(addrs.tester2, ethers.utils.parseEther('100'));

    const StarlMigrator = await ethers.getContractFactory("StarlMigrator");
    const starlMigrator = StarlMigrator.attach(addrs.migrator);
    const StarlToken = await ethers.getContractFactory("StarlToken");
    const token = StarlToken.attach(addrs.token);
    const oldToken = StarlToken.attach(addrs.oldToken);

    return { starlMigrator, token, oldToken, owner, tester, tester2};
}

function roundPercent(a, b) {
    const precious = 10000;
    return Math.round(a.mul(precious * precious * 100).div(b).toNumber() / precious) / precious;
}

module.exports = {
    loadMigrationContracts,
    roundPercent
}