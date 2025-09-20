const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy SGL Token
    console.log("\n1. Deploying SGL Token...");
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy(parseEther("1000000")); // 1M tokens
    await token.deployed();
    console.log("SGL Token deployed to:", token.address);

    // Wait for a few blocks and verify
    console.log("Waiting for block confirmations...");
    await token.deployTransaction.wait(5);
    await verify(token.address, [parseEther("1000000")]);

    // 2. Deploy AvatarBase
    console.log("\n2. Deploying AvatarBase...");
    const AvatarBase = await ethers.getContractFactory("AvatarBase");
    const avatarBase = await AvatarBase.deploy();
    await avatarBase.deployed();
    console.log("AvatarBase deployed to:", avatarBase.address);
    await verify(avatarBase.address, []);

    // 3. Deploy AvatarWalletLink
    console.log("\n3. Deploying AvatarWalletLink...");
    const AvatarWalletLink = await ethers.getContractFactory("AvatarWalletLink");
    const walletLink = await AvatarWalletLink.deploy(avatarBase.address);
    await walletLink.deployed();
    console.log("AvatarWalletLink deployed to:", walletLink.address);
    await verify(walletLink.address, [avatarBase.address]);

    // 4. Deploy TimeCapsule
    console.log("\n4. Deploying TimeCapsule...");
    const TimeCapsule = await ethers.getContractFactory("TimeCapsule");
    const timeCapsule = await TimeCapsule.deploy(avatarBase.address);
    await timeCapsule.deployed();
    console.log("TimeCapsule deployed to:", timeCapsule.address);
    await verify(timeCapsule.address, [avatarBase.address]);

    // 5. Deploy DigitalLegacy
    console.log("\n5. Deploying DigitalLegacy...");
    const DigitalLegacy = await ethers.getContractFactory("DigitalLegacy");
    const digitalLegacy = await DigitalLegacy.deploy(avatarBase.address);
    await digitalLegacy.deployed();
    console.log("DigitalLegacy deployed to:", digitalLegacy.address);
    await verify(digitalLegacy.address, [avatarBase.address]);

    // Print all addresses for easy reference
    console.log("\n🎉 All contracts deployed successfully!");
    console.log("\nContract Addresses:");
    console.log("------------------");
    console.log("SGL Token:", token.address);
    console.log("AvatarBase:", avatarBase.address);
    console.log("AvatarWalletLink:", walletLink.address);
    console.log("TimeCapsule:", timeCapsule.address);
    console.log("DigitalLegacy:", digitalLegacy.address);

    // Save addresses to .env file
    const fs = require('fs');
    const envFile = '.env';
    const envVars = {
        SGL_TOKEN_ADDRESS: token.address,
        AVATAR_BASE_ADDRESS: avatarBase.address,
        AVATAR_WALLET_LINK_ADDRESS: walletLink.address,
        TIME_CAPSULE_ADDRESS: timeCapsule.address,
        DIGITAL_LEGACY_ADDRESS: digitalLegacy.address
    };

    let envContent = fs.readFileSync(envFile, 'utf8');
    for (const [key, value] of Object.entries(envVars)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    }
    fs.writeFileSync(envFile, envContent);
    console.log("\nContract addresses saved to .env file");
}

async function verify(address, constructorArguments) {
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructorArguments,
        });
        console.log("Contract verified on Etherscan ✅");
    } catch (error) {
        if (error.message.includes("already verified")) {
            console.log("Contract already verified ✅");
        } else {
            console.log("Verification failed ❌:", error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });