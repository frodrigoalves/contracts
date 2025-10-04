require("dotenv").config();
const { ethers } = require("hardhat");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required to check token balances.`);
  }
  return value;
}

async function main() {
  const contractAddress = requireEnv("CONTRACT_ADDRESS");

  const [deployer] = await ethers.getSigners();

  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Token contract address: ${contractAddress}`);

  const token = await ethers.getContractAt("MockToken", contractAddress);

  const [totalSupply, deployerTokenBalance, deployerEthBalance] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(deployer.address),
    ethers.provider.getBalance(deployer.address),
  ]);

  console.log(`Total supply: ${ethers.utils.formatEther(totalSupply)} MOCK`);
  console.log(`Deployer token balance: ${ethers.utils.formatEther(deployerTokenBalance)} MOCK`);
  console.log(`Deployer ETH balance: ${ethers.utils.formatEther(deployerEthBalance)} ETH`);
}

main().catch((error) => {
  console.error("Failed to check balances:", error?.message ?? error);
  process.exitCode = 1;
});
