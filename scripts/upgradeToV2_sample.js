const { ethers, network, upgrades } = require("hardhat");
const { expect } = require("chai");

const fs = require("fs");
const util = require("./util.js");

const basicStakingManagerContractName = "TANSOBasicStakingManager_v2"
const feeStakingManagerContractName = "TANSOFeeStakingManager_v2"
const tokenContractName = "TANSO_v2";

const basicStakingManagerProxyContractFilename =
    `${basicStakingManagerContractName}_proxyContractAddress_${network.name}.json`;
const basicStakingManagerProxyContractObject =
    fs.readFileSync(util.frontendContractsDir + "/" + basicStakingManagerProxyContractFilename);
const basicStakingManagerProxyContractAddress =
    JSON.parse(basicStakingManagerProxyContractObject)["proxyContractAddress"];

const feeStakingManagerProxyContractFilename =
    `${feeStakingManagerContractName}_proxyContractAddress_${network.name}.json`;
const feeStakingManagerProxyContractObject =
    fs.readFileSync(util.frontendContractsDir + "/" + feeStakingManagerProxyContractFilename);
const feeStakingManagerProxyContractAddress =
    JSON.parse(feeStakingManagerProxyContractObject)["proxyContractAddress"];

const tokenProxyContractFilename =
    `${tokenContractName}_proxyContractAddress_${network.name}.json`;
const tokenProxyContractObject =
    fs.readFileSync(util.frontendContractsDir + "/" + tokenProxyContractFilename);
const tokenProxyContractAddress =
    JSON.parse(tokenProxyContractObject)["proxyContractAddress"];

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log();

  console.log("Upgrading contracts with the account: %s", deployer.address);
  console.log("Account balance before upgrading: %s", (await deployer.getBalance()).toString());
  console.log();

  console.log("basicStakingManagerProxyContractAddress: %s", basicStakingManagerProxyContractAddress);
  console.log("feeStakingManagerProxyContractAddress: %s", feeStakingManagerProxyContractAddress);
  console.log("tokenProxyContractAddress: %s", tokenProxyContractAddress);
  console.log();

  // Updates the basic staking manager contract.
  const basicStakingManagerContractFactory = await ethers.getContractFactory(basicStakingManagerContractName);
  console.log("Upgrading to '%s' ...", basicStakingManagerContractName);
  const basicStakingManagerProxyContract =
      await upgrades.upgradeProxy(basicStakingManagerProxyContractAddress, basicStakingManagerContractFactory);
  const basicStakingManagerImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(basicStakingManagerProxyContract.address);
  console.log("'%s' has been upgraded.", basicStakingManagerContractName);
  console.log("    * Proxy address: %s", basicStakingManagerProxyContract.address);
  console.log("   (* Implementation address: %s)", basicStakingManagerImplementationContractAddress);
  console.log();

  // Makes sure the new version contract's address is the same as the old one.
  expect(basicStakingManagerProxyContract.address).to.equal(basicStakingManagerProxyContractAddress);

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(basicStakingManagerProxyContract.address,
                         basicStakingManagerImplementationContractAddress,
                         basicStakingManagerContractName);

  // Updates the fee staking manager contract.
  const feeStakingManagerContractFactory = await ethers.getContractFactory(feeStakingManagerContractName);
  console.log("Upgrading to '%s' ...", feeStakingManagerContractName);
  const feeStakingManagerProxyContract =
      await upgrades.upgradeProxy(feeStakingManagerProxyContractAddress, feeStakingManagerContractFactory);
  const feeStakingManagerImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(feeStakingManagerProxyContract.address);
  console.log("'%s' has been upgraded.", feeStakingManagerContractName);
  console.log("    * Proxy address: %s", feeStakingManagerProxyContract.address);
  console.log("   (* Implementation address: %s)", feeStakingManagerImplementationContractAddress);
  console.log();

  // Makes sure the new version contract's address is the same as the old one.
  expect(feeStakingManagerProxyContract.address).to.equal(feeStakingManagerProxyContractAddress);

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(feeStakingManagerProxyContract.address,
                         feeStakingManagerImplementationContractAddress,
                         feeStakingManagerContractName);

  // Updates the token contract.
  const tokenContractFactory = await ethers.getContractFactory(tokenContractName);
  console.log("Upgrading to '%s' ...", tokenContractName);
  const tokenProxyContract =
      await upgrades.upgradeProxy(tokenProxyContractAddress, tokenContractFactory);
  const tokenImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(tokenProxyContract.address);
  console.log("'%s' has been upgraded.", tokenContractName);
  console.log("    * Proxy address: %s", tokenProxyContract.address);
  console.log("   (* Implementation address: %s)", tokenImplementationContractAddress);
  console.log();

  // Makes sure the new version contract's address is the same as the old one.
  expect(tokenProxyContract.address).to.equal(tokenProxyContractAddress);

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(tokenProxyContract.address,
                         tokenImplementationContractAddress,
                         tokenContractName);

  console.log("Upgrading contracts with the account: %s", deployer.address);
  console.log("Account balance after upgrading: %s", (await deployer.getBalance()).toString());
  console.log();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
