const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

const util = require("./util.js");

describe("TANSOFeeStakingManager_v1", () => {
  let owner;
  let account1;
  let account2;
  let account3;
  let accounts;

  const feeStakingManagerContractName = "TANSOFeeStakingManager_v1"
  let feeStakingManagerContractFactory;
  let feeStakingManagerProxyContract;

  const basicStakingManagerContractName = "TANSOBasicStakingManager_v1"
  let basicStakingManagerContractFactory;
  let basicStakingManagerProxyContract;

  const tokenContractName = "TANSO_v1"
  let tokenContractFactory;
  let tokenProxyContract;

  beforeEach(async () => {
    [owner, account1, account2, account3, ...accounts] = await ethers.getSigners();

    feeStakingManagerContractFactory = await ethers.getContractFactory(feeStakingManagerContractName);
    feeStakingManagerProxyContract =
        await upgrades.deployProxy(feeStakingManagerContractFactory,
                                   { initializer: "initialize", kind: "uups" });
    await feeStakingManagerProxyContract.deployed();

    basicStakingManagerContractFactory = await ethers.getContractFactory(basicStakingManagerContractName);
    basicStakingManagerProxyContract =
        await upgrades.deployProxy(basicStakingManagerContractFactory,
                                   { initializer: "initialize", kind: "uups" });
    await basicStakingManagerProxyContract.deployed();

    tokenContractFactory = await ethers.getContractFactory(tokenContractName);
    tokenProxyContract =
        await upgrades.deployProxy(tokenContractFactory,
                                   [basicStakingManagerProxyContract.address, feeStakingManagerProxyContract.address],
                                   { initializer: "initialize", kind: "uups" });
    await tokenProxyContract.deployed();
  });

  describe("Deployment", () => {
    it("should set the owner correctly", async() => {
      expect(await feeStakingManagerProxyContract.owner()).to.equal(owner.address);
    });

    it("should fail if the `msg.sender` is not owner", async() => {
      const transferAmount = util.toWeiTNS(100);  // 100 TNS.
      for (account in accounts) {
        await expect(feeStakingManagerProxyContract.connect(account).transferFeeStaking(tokenProxyContract.address, owner.address, transferAmount)).to.be.reverted;
      }
    });
  });

  describe("Staking", () => {
    it("should transfer the fee staking correctly", async () => {
      const transferAmount = util.toWeiTNS(100);  // 100 TNS.

      // Transfers TNS from the owner to fee staking manager contract.
      await tokenProxyContract.transfer(feeStakingManagerProxyContract.address, util.toNumber(2 * transferAmount));

      const ownerBalanceBefore = await tokenProxyContract.balanceOf(owner.address);
      const feeStakingManagerBalanceBefore = await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address);

      // Transfers TNS from the fee staking manager contract to account1.
      await feeStakingManagerProxyContract.transferFeeStaking(tokenProxyContract.address, account1.address, transferAmount);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(transferAmount);

      // Transfers TNS from the fee staking manager contract to account2.
      await feeStakingManagerProxyContract.transferFeeStaking(tokenProxyContract.address, account2.address, transferAmount);
      expect(await tokenProxyContract.balanceOf(account2.address)).to.equal(transferAmount);

      // Tries to transfer TNS from the fee staking manager contract to account3, but it should fail because the balance is insufficient. 
      await expect(feeStakingManagerProxyContract.transferFeeStaking(tokenProxyContract.address, account3.address, transferAmount)).to.be.reverted;

      const ownerBalanceAfter = util.toNumber(ownerBalanceBefore);
      const feeStakingManagerBalanceAfter = util.toNumber(feeStakingManagerBalanceBefore - 2 * transferAmount);

      expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(ownerBalanceAfter);
      expect(await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address)).to.equal(feeStakingManagerBalanceAfter);
    });
  });
});
