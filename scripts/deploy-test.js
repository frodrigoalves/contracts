async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Token = await ethers.getContractFactory("MockToken");
  const token = await Token.deploy(ethers.utils.parseEther("1000000")); // 1M
  await token.deployed();

  console.log("tSGL deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

