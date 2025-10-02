const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy MockToken
    const MockToken = await ethers.getContractFactory("MockToken");
    const initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion tokens
    const token = await MockToken.deploy(initialSupply);

    await token.deployed();

    console.log("MockToken deployed to:", token.address);
    console.log("Initial supply:", initialSupply.toString());

    // Verify contract on Etherscan
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contract...");
        try {
            await hre.run("verify:verify", {
                address: token.address,
                constructorArguments: [initialSupply],
            });
            console.log("Contract verified on Etherscan");
        } catch (error) {
            console.log("Verification failed:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });