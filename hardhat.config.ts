import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
require("solidity-coverage");
require('hardhat-contract-sizer');
import { handleHardhatTasks } from "./taskHandler";

handleHardhatTasks();

dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

 const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    goerli: {
      chainId: 5,
      gasPrice: 3000000000,
      url: process.env.GOERLI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      allowUnlimitedContractSize: true
    },
  },
  etherscan: {
    apiKey: process.env.ETHEREUM_API_KEY
  }
};

export default config;