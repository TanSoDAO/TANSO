// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./TANSOSafeMath_v1.sol";

/**
 * @title Test contract of the safe math library for the TANSO token.
 *
 * This contract is for the test of TANSOSafeMath_v1.sol, the safe math library for the TANSO token.
 */
contract TANSOSafeMathTest_v1 {
  using TANSOSafeMath_v1 for uint256;

  /**
   * Calculates "A * B / C" safely.
   *
   * @param A The 1st operand.
   * @param B The 2nd operand.
   * @param C The 3rd operand.
   * @return The calculated result.
   */
  function safeAmulBdivC(uint256 A, uint256 B, uint256 C) external pure returns (uint256) {
    // AmulBdivC = A * B / C
    (bool isCalculationSuccess, uint256 AmulBdivC) = A.tryAmulBdivC(B, C);
    require(isCalculationSuccess, "TANSOSafeMathTest_v1: Failed to calculate `A * B / C`.");
    return AmulBdivC;
  }

  /**
   * Calculates "A * B / C" naively.
   *
   * @param A The 1st operand.
   * @param B The 2nd operand.
   * @param C The 3rd operand.
   * @return The calculated result.
   */
  function naiveAmulBdivC(uint256 A, uint256 B, uint256 C) external pure returns (uint256) {
    uint256 AmulBdivC = A * B / C;
    return AmulBdivC;
  }
}
