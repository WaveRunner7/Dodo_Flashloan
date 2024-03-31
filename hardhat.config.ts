import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "solidity-coverage";


const config: HardhatUserConfig = {
  solidity: {
     compilers: [
    
       {
         version: "0.8.4",
       },
       {
         version: "0.6.12",
       },
       {
         version: "0.8.19",
       },
       {
         version: "0.8.20",
       }
    ],
  },
  networks: {
    polygon: {
      url: "https://rpc.ankr.com/polygon",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    }
  }
};

export default config;

//accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"]