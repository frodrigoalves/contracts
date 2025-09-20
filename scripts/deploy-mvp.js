const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying MVP test contracts with account:", deployer.address);

    // 1. Deploy MockToken para testes
    console.log("\n1. Deploying MockToken (tSGL)...");
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy(parseEther("1000000")); // 1M tokens para teste
    await token.deployed();
    console.log("MockToken (tSGL) deployed to:", token.address);

    // Esperar confirmações e verificar
    console.log("Waiting for block confirmations...");
    await token.deployTransaction.wait(5);
    await verify(token.address, [parseEther("1000000")]);

    // 2. Deploy AvatarBase para testes
    console.log("\n2. Deploying Test AvatarBase...");
    const AvatarBase = await ethers.getContractFactory("AvatarBase");
    const avatarBase = await AvatarBase.deploy();
    await avatarBase.deployed();
    console.log("Test AvatarBase deployed to:", avatarBase.address);
    await verify(avatarBase.address, []);

    // 3. Deploy AvatarWalletLink para testes
    console.log("\n3. Deploying Test AvatarWalletLink...");
    const AvatarWalletLink = await ethers.getContractFactory("AvatarWalletLink");
    const walletLink = await AvatarWalletLink.deploy(avatarBase.address);
    await walletLink.deployed();
    console.log("Test AvatarWalletLink deployed to:", walletLink.address);
    await verify(walletLink.address, [avatarBase.address]);

    // 4. Deploy TimeCapsule para testes
    console.log("\n4. Deploying Test TimeCapsule...");
    const TimeCapsule = await ethers.getContractFactory("TimeCapsule");
    const timeCapsule = await TimeCapsule.deploy(avatarBase.address);
    await timeCapsule.deployed();
    console.log("Test TimeCapsule deployed to:", timeCapsule.address);
    await verify(timeCapsule.address, [avatarBase.address]);

    // 5. Deploy DigitalLegacy para testes
    console.log("\n5. Deploying Test DigitalLegacy...");
    const DigitalLegacy = await ethers.getContractFactory("DigitalLegacy");
    const digitalLegacy = await DigitalLegacy.deploy(avatarBase.address);
    await digitalLegacy.deployed();
    console.log("Test DigitalLegacy deployed to:", digitalLegacy.address);
    await verify(digitalLegacy.address, [avatarBase.address]);

    // Imprimir todos os endereços para referência
    console.log("\n🎉 MVP test contracts deployed successfully!");
    console.log("\nTest Contract Addresses (Sepolia):");
    console.log("----------------------------------");
    console.log("MockToken (tSGL):", token.address);
    console.log("Test AvatarBase:", avatarBase.address);
    console.log("Test AvatarWalletLink:", walletLink.address);
    console.log("Test TimeCapsule:", timeCapsule.address);
    console.log("Test DigitalLegacy:", digitalLegacy.address);

    // Salvar endereços no .env
    const fs = require('fs');
    const envFile = '.env';
    const envVars = {
        MOCK_TOKEN_ADDRESS: token.address,
        TEST_AVATAR_BASE_ADDRESS: avatarBase.address,
        TEST_AVATAR_WALLET_LINK_ADDRESS: walletLink.address,
        TEST_TIME_CAPSULE_ADDRESS: timeCapsule.address,
        TEST_DIGITAL_LEGACY_ADDRESS: digitalLegacy.address
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
    console.log("\nTest contract addresses saved to .env file");

    console.log("\n⚠️ Note: These are TEST contracts for MVP validation.");
    console.log("The official SGL token will be deployed after MVP feedback.");
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