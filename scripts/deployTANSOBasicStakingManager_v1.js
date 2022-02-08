const { ethers, upgrades } = require("hardhat");

const util = require("./util.js");

const basicStakingManagerContractName = "TANSOBasicStakingManager_v1"

async function main() {
  const [deployer, ...accounts] = await ethers.getSigners();
  console.log();

  console.log("Deploying contracts with the account: %s", deployer.address);
  console.log("Account balance before deploying: %s", (await deployer.getBalance()).toString());
  console.log();

  // Deploys the basic staking manager contract.
  const basicStakingManagerContractFactory = await ethers.getContractFactory(basicStakingManagerContractName);
  console.log("Deploying (upgradeable) '%s' ...", basicStakingManagerContractName);
  const basicStakingManagerProxyContract =
      await upgrades.deployProxy(basicStakingManagerContractFactory,
                                 { initializer: "initialize", kind: "uups" });
  await basicStakingManagerProxyContract.deployed();
  const basicStakingManagerImplementationContractAddress =
      await upgrades.erc1967.getImplementationAddress(basicStakingManagerProxyContract.address);
  console.log("'%s' has been deployed.", basicStakingManagerContractName);
  console.log("    * Proxy address: %s", basicStakingManagerProxyContract.address);
  console.log("   (* Implementation address: %s)", basicStakingManagerImplementationContractAddress);
  console.log();

  // Saves the contracts' address and ABI.
  util.saveFrontendFiles(basicStakingManagerProxyContract.address,
                         basicStakingManagerImplementationContractAddress,
                         basicStakingManagerContractName);

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
