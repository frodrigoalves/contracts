const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeviceAuth", function () {
    let DeviceAuth;
    let DeviceRegistry;
    let BiometricValidator;
    let deviceAuth;
    let deviceRegistry;
    let biometricValidator;
    let owner;
    let admin;
    let validator;
    let user;
    let deviceId;

    beforeEach(async function () {
        [owner, admin, validator, user] = await ethers.getSigners();

        // Deploy DeviceRegistry
        DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
        deviceRegistry = await DeviceRegistry.deploy();
        await deviceRegistry.deployed();

        // Deploy BiometricValidator
        BiometricValidator = await ethers.getContractFactory("BiometricValidator");
        biometricValidator = await BiometricValidator.deploy(deviceRegistry.address);
        await biometricValidator.deployed();

        // Deploy DeviceAuth
        DeviceAuth = await ethers.getContractFactory("DeviceAuth");
        deviceAuth = await DeviceAuth.deploy(deviceRegistry.address, biometricValidator.address);
        await deviceAuth.deployed();

        // Setup roles
        const AUTH_ADMIN_ROLE = await deviceAuth.AUTH_ADMIN_ROLE();
        const VALIDATOR_ROLE = await deviceAuth.VALIDATOR_ROLE();
        await deviceAuth.grantRole(AUTH_ADMIN_ROLE, admin.address);
        await deviceAuth.grantRole(VALIDATOR_ROLE, validator.address);

        // Register test device
        const MANUFACTURER_ROLE = await deviceRegistry.MANUFACTURER_ROLE();
        await deviceRegistry.grantRole(MANUFACTURER_ROLE, owner.address);

        const serialNumber = "SGLPEN001";
        const deviceType = "PREMIUM";
        const firmwareHash = ethers.utils.id("1.0.0");
        const certifications = "CE,FCC,ANATEL";
        const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

        await deviceRegistry.registerDevice(
            serialNumber,
            deviceType,
            user.address,
            firmwareHash,
            certifications,
            publicKey
        );

        deviceId = ethers.utils.solidityKeccak256(
            ["string", "uint256", "address"],
            [serialNumber, (await ethers.provider.getBlock()).timestamp, user.address]
        );

        // Setup biometric template
        const VALIDATOR_ROLE_BIO = await biometricValidator.VALIDATOR_ROLE();
        await biometricValidator.grantRole(VALIDATOR_ROLE_BIO, validator.address);

        const faceHash = ethers.utils.id("face_data");
        const fingerprintHash = ethers.utils.id("fingerprint_data");
        const gestureHash = ethers.utils.id("gesture_data");
        const voiceHash = ethers.utils.id("voice_data");

        await biometricValidator.connect(validator).registerTemplate(
            deviceId,
            faceHash,
            fingerprintHash,
            gestureHash,
            voiceHash,
            true
        );
    });

    describe("Authentication Sessions", function () {
        it("Should start auth session", async function () {
            await expect(deviceAuth.connect(user).startAuthSession(deviceId))
                .to.emit(deviceAuth, "AuthSessionStarted");
        });

        it("Should complete auth session successfully", async function () {
            const sessionId = await deviceAuth.connect(user).callStatic.startAuthSession(deviceId);
            await deviceAuth.connect(user).startAuthSession(deviceId);

            // Complete biometric validation
            const bioSessionId = await biometricValidator.callStatic.startValidation(deviceId);
            await biometricValidator.startValidation(deviceId);

            const biometrics = ["face", "fingerprint", "gesture"];
            for (const type of biometrics) {
                const dataHash = ethers.utils.id(`${type}_data`);
                const message = ethers.utils.arrayify(
                    ethers.utils.solidityKeccak256(
                        ["bytes32", "bytes32"],
                        [dataHash, deviceId]
                    )
                );
                const signature = await user.signMessage(message);

                await biometricValidator.connect(validator).validateBiometric(
                    bioSessionId,
                    deviceId,
                    type,
                    dataHash,
                    signature
                );
            }

            await biometricValidator.connect(validator).completeValidation(bioSessionId, deviceId);

            // Complete challenge response
            const challenge = await deviceAuth.connect(user).authSessions(sessionId);
            const challengeResponse = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            const messageHash = ethers.utils.solidityKeccak256(
                ["bytes32", "bytes"],
                [challenge.challengeHash, challengeResponse]
            );
            const signature = await user.signMessage(ethers.utils.arrayify(messageHash));

            await expect(
                deviceAuth.connect(user).completeAuthSession(
                    sessionId,
                    challengeResponse,
                    signature
                )
            )
                .to.emit(deviceAuth, "AuthSessionCompleted")
                .withArgs(sessionId, true);
        });

        it("Should fail auth session with invalid challenge response", async function () {
            const sessionId = await deviceAuth.connect(user).callStatic.startAuthSession(deviceId);
            await deviceAuth.connect(user).startAuthSession(deviceId);

            const invalidResponse = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            const invalidSignature = ethers.utils.hexlify(ethers.utils.randomBytes(65));

            await expect(
                deviceAuth.connect(user).completeAuthSession(
                    sessionId,
                    invalidResponse,
                    invalidSignature
                )
            ).to.be.reverted;
        });
    });

    describe("Security Events", function () {
        it("Should log security events", async function () {
            const eventType = "SUSPICIOUS_ACCESS";
            const proofData = "Unauthorized location detected";

            await expect(
                deviceAuth.connect(validator).logSecurityEvent(deviceId, eventType, proofData)
            )
                .to.emit(deviceAuth, "SecurityEventLogged");
        });

        it("Should auto-lock device after multiple security events", async function () {
            for (let i = 0; i < 3; i++) {
                await deviceAuth.connect(validator).logSecurityEvent(
                    deviceId,
                    "FAILED_AUTH",
                    "Multiple failed attempts"
                );
            }

            const isLocked = await deviceAuth.deviceLocked(deviceId);
            expect(isLocked).to.be.true;
        });
    });

    describe("Device Locking", function () {
        it("Should lock device", async function () {
            await expect(deviceAuth.connect(admin).lockDevice(deviceId))
                .to.emit(deviceAuth, "DeviceLocked");

            const isLocked = await deviceAuth.deviceLocked(deviceId);
            expect(isLocked).to.be.true;
        });

        it("Should not unlock device before lockout period", async function () {
            await deviceAuth.connect(admin).lockDevice(deviceId);
            await expect(
                deviceAuth.connect(admin).unlockDevice(deviceId)
            ).to.be.revertedWith("Lockout active");
        });

        it("Should prevent auth session for locked device", async function () {
            await deviceAuth.connect(admin).lockDevice(deviceId);
            await expect(
                deviceAuth.connect(user).startAuthSession(deviceId)
            ).to.be.revertedWith("Device locked");
        });
    });

    describe("Access Control", function () {
        it("Should only allow validator to log security events", async function () {
            await expect(
                deviceAuth.connect(user).logSecurityEvent(
                    deviceId,
                    "TEST_EVENT",
                    "Test data"
                )
            ).to.be.reverted;
        });

        it("Should only allow admin to lock device", async function () {
            await expect(
                deviceAuth.connect(user).lockDevice(deviceId)
            ).to.be.reverted;
        });
    });
});