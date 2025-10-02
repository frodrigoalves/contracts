const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TokenFaucet with account:", deployer.address);

    // Replace with actual deployed token address
  const tokenAddress = "0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1"; // UPDATE THIS

  const TokenFaucet = await ethers.getContractFactory("TokenFaucet");
  const faucet = await TokenFaucet.deploy(tokenAddress);
  await faucet.deployed();

  console.log("✅ TokenFaucet deployed to:", faucet.address);

  // Transfer some tokens to faucet
  const SGLToken = await ethers.getContractFactory("SGLToken");
  const token = await SGLToken.attach(tokenAddress);
  const faucetAmount = ethers.utils.parseUnits("10000", 18); // 10k tokens for faucet
  await token.transfer(faucet.address, faucetAmount);
  console.log(`✅ Transferred ${faucetAmount.toString()} SGL to faucet`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});