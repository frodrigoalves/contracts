const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting with account:", deployer.address);

  // Replace with actual deployed token address
  const tokenAddress = "0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1"; // UPDATE THIS

  const SGLToken = await ethers.getContractFactory("SGLToken");
  const token = await SGLToken.attach(tokenAddress);

  const recipient = "0x043bd4333C85288258d30546856ed891ee4644e3";
  const amount = ethers.utils.parseUnits("1000000", 18); // 1 million tokens

  await token.mint(recipient, amount);
  console.log(`✅ Minted ${amount.toString()} SGL to ${recipient}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});