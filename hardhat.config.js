<<<<<<< ours
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

function requireEnv(variableName) {
  const value = process.env[variableName];
  if (!value || value.trim() === "") {
    throw new Error(`Defina ${variableName} no .env ou nas variáveis de ambiente.`);
  }
  return value.trim();
}

const PRIVATE_KEY = requireEnv("PRIVATE_KEY");
if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
  throw new Error("PRIVATE_KEY deve ser uma chave hexadecimal de 64 caracteres com prefixo 0x.");
}

const SEPOLIA_RPC_URL = requireEnv("SEPOLIA_RPC_URL");
const MUMBAI_RPC_URL = requireEnv("MUMBAI_RPC_URL");
const ETHERSCAN_API_KEY = requireEnv("ETHERSCAN_API_KEY");
const POLYGONSCAN_API_KEY = requireEnv("POLYGONSCAN_API_KEY");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY]
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY
    }
  }
};
=======
import 'dotenv/config';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';

const config = {
  solidity: '0.8.20',
  plugins: [hardhatEthers],
};

export default config;
>>>>>>> theirs
