require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");

// Reads important keys from files (rather than hard-coding them).
const { mainnetAlchemyApiKey, ropstenAlchemyApiKey, privateKey, etherscanApiKey } =
    require(__dirname + "/.key.json");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${mainnetAlchemyApiKey}`,
      accounts: [privateKey],
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ropstenAlchemyApiKey}`,
      accounts: [privateKey],
    },
  },
  etherscan: {
    apiKey: etherscanApiKey
  }
};
