const { artifacts, network } = require("hardhat");

const frontendContractsDir = __dirname + "/../frontend/src/contracts";

function saveFrontendFiles(proxyContractAddress, implementationContractAddress, contractName) {
  const fs = require("fs");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, {recursive: true});
  }

  // Saves the proxy contract's address.
  let proxyContractAddressObject = {};
  proxyContractAddressObject["proxyContractAddress"] = proxyContractAddress;
  fs.writeFileSync(frontendContractsDir + `/${contractName}_proxyContractAddress_${network.name}.json`,
                   JSON.stringify(proxyContractAddressObject, undefined, 2));

  // Saves the implementation contract's address.
  let implementationContractAddressObject = {};
  implementationContractAddressObject["implementationContractAddress"] = implementationContractAddress;
  fs.writeFileSync(frontendContractsDir + `/${contractName}_implementationContractAddress_${network.name}.json`,
                   JSON.stringify(implementationContractAddressObject, undefined, 2));

  // Saves the contract's ABI etc.
  const contractArtifact = artifacts.readArtifactSync(contractName);
  fs.writeFileSync(frontendContractsDir + `/${contractName}.json`,
                   JSON.stringify(contractArtifact, null, 2));
}

module.exports = { frontendContractsDir, saveFrontendFiles };
