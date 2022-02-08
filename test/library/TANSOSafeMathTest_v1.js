const { ethers } = require("hardhat");
const { expect } = require("chai");

const util = require("../util.js");

describe("TANSOSafeMathTest_v1", () => {
  let owner;
  let account1;
  let account2;
  let account3;
  let accounts;

  const testContractName = "TANSOSafeMathTest_v1"
  let testContractFactory;
  let testContract;

  beforeEach(async () => {
    [owner, account1, account2, account3, ...accounts] = await ethers.getSigners();

    testContractFactory = await ethers.getContractFactory(testContractName);
    testContract = await testContractFactory.deploy();
    await testContract.deployed();
  });

  describe("Calculation", () => {
    it("should calculate `A * B / C` safely", async() => {
      const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
      const expectedResult = "115792089237316195423570985008687907853269984665640564039457584007913129639930";

      // `safeAmulBdivC()` will try multiplying `maxUint256` and (1st) `10` first, but it will fail due to the overflow.
      // So, the function then will try dividing `maxUint256` and (2nd) `10` first, and it will success.
      // Now, the intermediate-result is "11579208923731619542357098500868790785326998466564056403945758400791312963993"
      // due to the round down in uint division.
      // Finally, the function will try multiplying the intermediate-result and (1st) `10`, and it will also success.
      // The final-result should be "115792089237316195423570985008687907853269984665640564039457584007913129639930".

      // safeResult = maxUint256 * 10 / 10
      const safeResult = await testContract.safeAmulBdivC(maxUint256, 10, 10);
      expect(safeResult).to.equal(expectedResult);

      // On the other hand, calculating naively should fail due to the overflow in the multiplication "maxUint256 * 10".
      await expect(testContract.naiveAmulBdivC(maxUint256, 10, 10)).to.be.reverted;
    });
  });
});
