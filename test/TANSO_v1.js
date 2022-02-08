const { ethers, network, upgrades } = require("hardhat");
const { expect } = require("chai");

const util = require("./util.js");

describe("TANSO_v1", () => {
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
      expect(await tokenProxyContract.owner()).to.equal(owner.address);
    });

    it("should set the mutex lock flag for transferring correctly", async() => {
      expect(await tokenProxyContract.isTransferMutexLocked()).to.equal(false);
    });

    it("should initialize the list of the token holder addresses correctly", async() => {
      const tokenHolderAddresses = await tokenProxyContract.tokenHolderAddresses();

      expect(tokenHolderAddresses.length).to.equal(4);
      expect(tokenHolderAddresses[0]).to.equal(tokenProxyContract.address);
      expect(tokenHolderAddresses[1]).to.equal(basicStakingManagerProxyContract.address);
      expect(tokenHolderAddresses[2]).to.equal(feeStakingManagerProxyContract.address);
      expect(tokenHolderAddresses[3]).to.equal(owner.address);
    });

    it("should mint the whole capped amount of the tokens to the owner", async() => {
      const cap = await tokenProxyContract.cap();
      const totalSupply = await tokenProxyContract.totalSupply();
      const ownerBalance = await tokenProxyContract.balanceOf(owner.address);

      const expectedValue = util.toWeiTNS(1000000000);  // 1 billion TNS.

      expect(cap).to.equal(expectedValue);
      expect(totalSupply).to.equal(expectedValue);
      expect(ownerBalance).to.equal(expectedValue);
    });

    it("should fail if the `msg.sender` is not owner", async() => {
      for (account in accounts) {
        await expect(tokenProxyContract.connect(account).setFeeStakingManagerAddress(account.address)).to.be.reverted;
        await expect(tokenProxyContract.connect(account).setBasicStakingManagerAddress(account.address)).to.be.reverted;
        await expect(tokenProxyContract.connect(account).setFeePerPricePercentage(42)).to.be.reverted;
        await expect(tokenProxyContract.connect(account).setFeeStakingPerFeePercentage(42)).to.be.reverted;
        await expect(tokenProxyContract.connect(account).setIsTransferMutexLocked(true)).to.be.reverted;
      }
    });
  });

  describe("Transfer", () => {
    it("should transfer tokens and update the list of the token holder addresses correctly", async() => {
      const ownerBalanceBefore = await tokenProxyContract.balanceOf(owner.address);
      const transferAmount = util.toWeiTNS(100);  // 100 TNS.

      // Transfers TNS from the owner to account1.
      await tokenProxyContract.transfer(account1.address, transferAmount);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(transferAmount);

      // Transfers TNS from the owner to account2.
      await tokenProxyContract.transfer(account2.address, transferAmount);
      expect(await tokenProxyContract.balanceOf(account2.address)).to.equal(transferAmount);

      // Transfers TNS from the owner to account3 (by account1).
      await tokenProxyContract.approve(account1.address, transferAmount);
      await tokenProxyContract.connect(account1).transferFrom(owner.address, account3.address, transferAmount);
      expect(await tokenProxyContract.balanceOf(account3.address)).to.equal(transferAmount);

      const ownerBalanceAfter = util.toNumber(ownerBalanceBefore - 3 * transferAmount);
      expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(ownerBalanceAfter);

      const tokenHolderAddresses = await tokenProxyContract.tokenHolderAddresses();
      expect(tokenHolderAddresses.length).to.equal(7);
      expect(tokenHolderAddresses[0]).to.equal(tokenProxyContract.address);
      expect(tokenHolderAddresses[1]).to.equal(basicStakingManagerProxyContract.address);
      expect(tokenHolderAddresses[2]).to.equal(feeStakingManagerProxyContract.address);
      expect(tokenHolderAddresses[3]).to.equal(owner.address);
      expect(tokenHolderAddresses[4]).to.equal(account1.address);
      expect(tokenHolderAddresses[5]).to.equal(account2.address);
      expect(tokenHolderAddresses[6]).to.equal(account3.address);
    });

    it("should fail if the transfer is mutex locked by the owner", async () => {
      const transferAmount = util.toWeiTNS(100);  // 100 TNS.

      const ownerBalanceBefore = await tokenProxyContract.balanceOf(owner.address);
      const account1BalanceBefore = await tokenProxyContract.balanceOf(account1.address);
      const account2BalanceBefore = await tokenProxyContract.balanceOf(account2.address);
      const account3BalanceBefore = await tokenProxyContract.balanceOf(account3.address);

      await tokenProxyContract.setIsTransferMutexLocked(true);

      // Tries to transfer TNS from the owner to account1, but it should fail because the transfer is mutex locked. 
      await expect(tokenProxyContract.transfer(account1.address, transferAmount)).to.be.reverted;

      // Tries to transfer TNS from the owner to account2, but it should fail because the transfer is mutex locked. 
      await expect(tokenProxyContract.transfer(account2.address, transferAmount)).to.be.reverted;

      // Tries to transfer TNS from the owner to account3 (by account1), but it should fail because the transfer is mutex locked. 
      await tokenProxyContract.approve(account1.address, transferAmount);
      await expect(tokenProxyContract.connect(account1).transferFrom(owner.address, account3.address, transferAmount)).to.be.reverted;

      await tokenProxyContract.setIsTransferMutexLocked(false);

      expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(ownerBalanceBefore);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(account1BalanceBefore);
      expect(await tokenProxyContract.balanceOf(account2.address)).to.equal(account2BalanceBefore);
      expect(await tokenProxyContract.balanceOf(account3.address)).to.equal(account3BalanceBefore);
    });

    it("should fail if the owner's balance is still locked up", async () => {
      const cap = await tokenProxyContract.cap();

      const lockUpTimestamp1 = 1672531200;  // [s] Unix timestamp: Jan. 1st 2023 00:00:00 UTC
      const lockUpPercentage1 = 30;  // [%]

      const lockUpTimestamp2 = 1704067200;  // [s] Unix timestamp: Jan. 1st 2024 00:00:00 UTC
      const lockUpPercentage2 = 25;  // [%]

      const lockUpTimestamp3 = 1735689600;  // [s] Unix timestamp: Jan. 1st 2025 00:00:00 UTC
      const lockUpPercentage3 = 20;  // [%]

      const lockUpTimestamp4 = 1767225600;  // [s] Unix timestamp: Jan. 1st 2026 00:00:00 UTC
      const lockUpPercentage4 = 15;  // [%]

      const lockUpTimestamp5 = 1798761600;  // [s] Unix timestamp: Jan. 1st 2027 00:00:00 UTC
      const lockUpPercentage5 = 10;  // [%]

      const lockUpTimestamp6 = 1830297600;  // [s] Unix timestamp: Jan. 1st 2028 00:00:00 UTC
      const lockUpPercentage6 = 5;  // [%]

      const latestBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true]);
      const currentTimestamp = parseInt(latestBlock.timestamp, 16);
      /*
      console.log("latestBlock.number =", parseInt(latestBlock.number, 16));
      console.log("latestBlock.timestamp =", parseInt(latestBlock.timestamp, 16));
      console.log();
      */

      const delta_time = 5;  // [s]

      // Step 1. Moves the timestamp forward by "evm_mine" JSON-RPC method.
      // Step 2. Sets a transfer amount that is over the locked up amount.
      // Step 3. Then `transfer()` should fail due to `_isBalanceOfOwnerLockedUp()`.
      // Step 4. Sets a transfer amount that is under the locked up amount.
      // Step 5. Then `transfer()` should success.
      // Step 6. Returns the transferred tokens to the owner for the next test.

      // If the current timestamp is before Jan. 1st 2023 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp1 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp1 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage1) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage1) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }

      // If the current timestamp is before Jan. 1st 2024 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp2 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp2 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage2) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage2) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }

      // If the current timestamp is before Jan. 1st 2025 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp3 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp3 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage3) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage3) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }

      // If the current timestamp is before Jan. 1st 2026 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp4 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp4 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage4) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage4) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }

      // If the current timestamp is before Jan. 1st 2027 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp5 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp5 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage5) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage5) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }

      // If the current timestamp is before Jan. 1st 2028 00:00:00 UTC...
      if (currentTimestamp < (lockUpTimestamp6 - delta_time)) {
        // Step 1
        await network.provider.send("evm_mine", [lockUpTimestamp6 - delta_time]);

        // Step 2, 3
        const overTransferAmount = util.toNumber(((100 - lockUpPercentage6) + 1) / 100 * cap);
        await expect(tokenProxyContract.transfer(account1.address, overTransferAmount)).to.be.reverted;

        // Step 4, 5, 6
        const underTransferAmount = util.toNumber(((100 - lockUpPercentage6) - 1) / 100 * cap);
        await tokenProxyContract.transfer(account1.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(underTransferAmount);
        await tokenProxyContract.connect(account1).transfer(owner.address, underTransferAmount);
        expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(cap);
      }
    });
  });

  describe("Transaction", () => {
    it("should calculate the fee correctly", async () => {
      const itemPrice = util.toWeiTNS(10000);  // 10,000 TNS.
      await tokenProxyContract.transfer(account1.address, itemPrice);

      const feeStakingManagerBalanceBefore = await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address);
      const ownerBalanceBefore = await tokenProxyContract.balanceOf(owner.address);
      const account1BalanceBefore = await tokenProxyContract.balanceOf(account1.address);
      const account2BalanceBefore = await tokenProxyContract.balanceOf(account2.address);
      const account3BalanceBefore = await tokenProxyContract.balanceOf(account3.address);

      const feePerPricePercentage = 4;  // [%]
      const feeStakingPerFeePercentage = 75;  // [%]
      await tokenProxyContract.setFeePerPricePercentage(feePerPricePercentage);
      await tokenProxyContract.setFeeStakingPerFeePercentage(feeStakingPerFeePercentage);

      //             ---> 10,000 TNS --->
      // `account1`                        `account2`
      //             <---    item    <---
      await tokenProxyContract.connect(account1).purchaseItem(account2.address, itemPrice, account3.address);

      const feeStakingManagerBalanceAfter = util.toNumber(Number(feeStakingManagerBalanceBefore) + Number(util.toWeiTNS(300)));
      const ownerBalanceAfter = util.toNumber(Number(ownerBalanceBefore));
      const account1BalanceAfter = util.toNumber(account1BalanceBefore - itemPrice);
      const account2BalanceAfter = util.toNumber(Number(account2BalanceBefore) + Number(util.toWeiTNS(9600)));
      const account3BalanceAfter = util.toNumber(Number(account3BalanceBefore) + Number(util.toWeiTNS(100)));

      // fee staking manager:    +300 TNS = 0.75 * 400 TNS = 300 TNS
      //               owner:    +/-0 TNS
      //            account1: -10,000 TNS
      //            account2:  +9,600 TNS = 10,000 TNS - (0.04 * 10,000 TNS) = 10,000 TNS - 400 TNS
      //            account3:    +100 TNS = 400 TNS - 300 TNS
      expect(await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address)).to.equal(feeStakingManagerBalanceAfter);
      expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(ownerBalanceAfter);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(account1BalanceAfter);
      expect(await tokenProxyContract.balanceOf(account2.address)).to.equal(account2BalanceAfter);
      expect(await tokenProxyContract.balanceOf(account3.address)).to.equal(account3BalanceAfter);
    });

    it("should fail if the input argument of `purchaseItem()` is invalid", async() => {
      const itemPrice = util.toWeiTNS(10000);  // 10,000 TNS.

      // `purchaseItem()` should fail because the balance is insufficient.
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(0);
      await expect(tokenProxyContract.connect(account1).purchaseItem(account2.address, itemPrice, account3.address)).to.be.reverted;

      // `purchaseItem()` should fail because the fee recipient's address is the same as `msg.sender`.
      await tokenProxyContract.transfer(account1.address, itemPrice);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(itemPrice);
      await expect(tokenProxyContract.connect(account1).purchaseItem(account2.address, itemPrice, account1.address)).to.be.reverted;
    });

    it("should fail if the transfer is mutex locked by the owner", async () => {
      const itemPrice = util.toWeiTNS(10000);  // 10,000 TNS.
      await tokenProxyContract.transfer(account1.address, itemPrice);

      const feeStakingManagerBalanceBefore = await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address);
      const ownerBalanceBefore = await tokenProxyContract.balanceOf(owner.address);
      const account1BalanceBefore = await tokenProxyContract.balanceOf(account1.address);
      const account2BalanceBefore = await tokenProxyContract.balanceOf(account2.address);
      const account3BalanceBefore = await tokenProxyContract.balanceOf(account3.address);

      await tokenProxyContract.setIsTransferMutexLocked(true);

      // Tries to purchase an item from account2 (by account1), but it should fail because the transfer is mutex locked. 
      await expect(tokenProxyContract.connect(account1).purchaseItem(account2.address, itemPrice, account3.address)).to.be.reverted;

      await tokenProxyContract.setIsTransferMutexLocked(false);

      expect(await tokenProxyContract.balanceOf(feeStakingManagerProxyContract.address)).to.equal(feeStakingManagerBalanceBefore);
      expect(await tokenProxyContract.balanceOf(owner.address)).to.equal(ownerBalanceBefore);
      expect(await tokenProxyContract.balanceOf(account1.address)).to.equal(account1BalanceBefore);
      expect(await tokenProxyContract.balanceOf(account2.address)).to.equal(account2BalanceBefore);
      expect(await tokenProxyContract.balanceOf(account3.address)).to.equal(account3BalanceBefore);
    });
  });
});
