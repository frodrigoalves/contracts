<<<<<<< ours
// scripts/check-balance.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Conta do deployer:", deployer.address);
  console.log("Saldo em ETH:", ethers.utils.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
=======
import 'dotenv/config';
import { network } from 'hardhat';

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required to check token balances.`);
  }
  return value;
}

async function main() {
  const contractAddress = requireEnv('CONTRACT_ADDRESS');

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Token contract address: ${contractAddress}`);

  const token = await ethers.getContractAt('MockToken', contractAddress);

  const [totalSupply, deployerTokenBalance, deployerEthBalance] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(deployer.address),
    ethers.provider.getBalance(deployer.address),
  ]);

  console.log(`Total supply: ${ethers.formatEther(totalSupply)} MOCK`);
  console.log(`Deployer token balance: ${ethers.formatEther(deployerTokenBalance)} MOCK`);
  console.log(`Deployer ETH balance: ${ethers.formatEther(deployerEthBalance)} ETH`);
}

main().catch((error) => {
  console.error('Failed to check balances:', error?.message ?? error);
  process.exitCode = 1;
>>>>>>> theirs
});
