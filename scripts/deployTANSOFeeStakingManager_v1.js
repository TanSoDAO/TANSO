const { ethers, upgrades } = require("hardhat");

const util = require("./util.js");

const feeStakingManagerContractName = "TANSOFeeStakingManager_v1"

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log();

  console.log("Deploying contracts with the account: %s", deployer.address);
  console.log("Account balance before deploying: %s", (await deployer.getBalance()).toString());
  console.log();

  // Deploys the fee staking manager contract.
  const feeStakingManagerContractFactory = await ethers.getContractFactory(feeStakingManagerContractName);
  console.log("Deploying (upgradeable) '%s' ...", feeStakingManagerContractName);
  const feeStakingManagerProxyContract =
      await upgrades.deployProxy(feeStakingManagerContractFactory,
                                 { initializer: "initialize", kind: "uups" });
  await feeStakingManagerProxyContract.deployed();
  const feeStakingManagerImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(feeStakingManagerProxyContract.address);
  console.log("'%s' has been deployed.", feeStakingManagerContractName);
  console.log("    * Proxy address: %s", feeStakingManagerProxyContract.address);
  console.log("   (* Implementation address: %s)", feeStakingManagerImplementationContractAddress);
  console.log();

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(feeStakingManagerProxyContract.address,
                         feeStakingManagerImplementationContractAddress,
                         feeStakingManagerContractName);

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
