const { ethers, upgrades } = require("hardhat");

const fs = require("fs");
const util = require("./util.js");

const basicStakingManagerContractName = "TANSOBasicStakingManager_v1"
const feeStakingManagerContractName = "TANSOFeeStakingManager_v1"
const tokenContractName = "TANSO_v1";

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

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log();

  console.log("Deploying contracts with the account: %s", deployer.address);
  console.log("Account balance before deploying: %s", (await deployer.getBalance()).toString());
  console.log();

  console.log("basicStakingManagerProxyContractAddress: %s", basicStakingManagerProxyContractAddress);
  console.log("feeStakingManagerProxyContractAddress: %s", feeStakingManagerProxyContractAddress);
  console.log();

  // Deploys the token contract.
  const tokenContractFactory = await ethers.getContractFactory(tokenContractName);
  console.log("Deploying (upgradeable) '%s' ...", tokenContractName);
  const tokenProxyContract =
      await upgrades.deployProxy(tokenContractFactory,
                                 [basicStakingManagerProxyContractAddress, feeStakingManagerProxyContractAddress],
                                 { initializer: "initialize", kind: "uups" });
  await tokenProxyContract.deployed();
  const tokenImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(tokenProxyContract.address);
  console.log("'%s' has been deployed.", tokenContractName);
  console.log("    * Proxy address: %s", tokenProxyContract.address);
  console.log("   (* Implementation address: %s)", tokenImplementationContractAddress);
  console.log();

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(tokenProxyContract.address,
                         tokenImplementationContractAddress,
                         tokenContractName);

  console.log("Deploying contracts with the account: %s", deployer.address);
  console.log("Account balance after deploying: %s", (await deployer.getBalance()).toString());
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
