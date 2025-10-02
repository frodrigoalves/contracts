const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const SGLToken = await ethers.getContractFactory("SGLToken");
  const initialSupply = ethers.utils.parseUnits("1000000000", 18); // 1 billion tokens
  const token = await SGLToken.deploy(deployer.address, initialSupply);
  await token.deployed();

  console.log("✅ SGLToken deployed to:", token.address);
  console.log("Initial supply:", initialSupply.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});