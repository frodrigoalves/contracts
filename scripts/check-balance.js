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
});
