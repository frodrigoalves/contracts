const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BiometricValidator", function () {
    let BiometricValidator;
    let DeviceRegistry;
    let biometricValidator;
    let deviceRegistry;
    let owner;
    let validator;
    let user;
    let deviceId;

    beforeEach(async function () {
        [owner, validator, user] = await ethers.getSigners();

        // Deploy DeviceRegistry first
        DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
        deviceRegistry = await DeviceRegistry.deploy();
        await deviceRegistry.deployed();

        // Deploy BiometricValidator with DeviceRegistry address
        BiometricValidator = await ethers.getContractFactory("BiometricValidator");
        biometricValidator = await BiometricValidator.deploy(deviceRegistry.address);
        await biometricValidator.deployed();

        // Setup roles
        const VALIDATOR_ROLE = await biometricValidator.VALIDATOR_ROLE();
        await biometricValidator.grantRole(VALIDATOR_ROLE, validator.address);

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
    });

    describe("Template Management", function () {
        it("Should register biometric template", async function () {
            const faceHash = ethers.utils.id("face_data");
            const fingerprintHash = ethers.utils.id("fingerprint_data");
            const gestureHash = ethers.utils.id("gesture_data");
            const voiceHash = ethers.utils.id("voice_data");

            await expect(
                biometricValidator.connect(validator).registerTemplate(
                    deviceId,
                    faceHash,
                    fingerprintHash,
                    gestureHash,
                    voiceHash,
                    true // voiceEnabled
                )
            ).to.emit(biometricValidator, "TemplateRegistered");
        });

        it("Should not allow duplicate templates", async function () {
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

            await expect(
                biometricValidator.connect(validator).registerTemplate(
                    deviceId,
                    faceHash,
                    fingerprintHash,
                    gestureHash,
                    voiceHash,
                    true
                )
            ).to.be.revertedWith("Template exists");
        });
    });

    describe("Validation Sessions", function () {
        beforeEach(async function () {
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

        it("Should start validation session", async function () {
            await expect(
                biometricValidator.startValidation(deviceId)
            )
                .to.emit(biometricValidator, "ValidationStarted");
        });

        it("Should validate biometric data", async function () {
            const sessionId = await biometricValidator.callStatic.startValidation(deviceId);
            await biometricValidator.startValidation(deviceId);

            const dataHash = ethers.utils.id("test_biometric_data");
            const message = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(
                    ["bytes32", "bytes32"],
                    [dataHash, deviceId]
                )
            );
            const signature = await user.signMessage(message);

            await expect(
                biometricValidator.connect(validator).validateBiometric(
                    sessionId,
                    deviceId,
                    "face",
                    dataHash,
                    signature
                )
            )
                .to.emit(biometricValidator, "BiometricValidated");
        });

        it("Should complete validation session", async function () {
            const sessionId = await biometricValidator.callStatic.startValidation(deviceId);
            await biometricValidator.startValidation(deviceId);

            // Validate all required biometrics
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
                    sessionId,
                    deviceId,
                    type,
                    dataHash,
                    signature
                );
            }

            await expect(
                biometricValidator.connect(validator).completeValidation(sessionId, deviceId)
            )
                .to.emit(biometricValidator, "SessionCompleted")
                .withArgs(sessionId, true);
        });
    });

    describe("Security Features", function () {
        let sessionId;
        let template;

        beforeEach(async function () {
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

            sessionId = await biometricValidator.callStatic.startValidation(deviceId);
            await biometricValidator.startValidation(deviceId);
        });

        it("Should track failed attempts", async function () {
            const invalidDataHash = ethers.utils.id("invalid_data");
            const message = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(
                    ["bytes32", "bytes32"],
                    [invalidDataHash, deviceId]
                )
            );
            const signature = await user.signMessage(message);

            await biometricValidator.connect(validator).validateBiometric(
                sessionId,
                deviceId,
                "face",
                invalidDataHash,
                signature
            );

            // Verify failed attempt was logged
            await expect(
                biometricValidator.failedAttempts(deviceId)
            ).to.eventually.equal(1);
        });

        it("Should limit validation attempts per session", async function () {
            const invalidDataHash = ethers.utils.id("invalid_data");
            const message = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(
                    ["bytes32", "bytes32"],
                    [invalidDataHash, deviceId]
                )
            );
            const signature = await user.signMessage(message);

            // Try more than allowed attempts
            for (let i = 0; i < 4; i++) {
                await biometricValidator.connect(validator).validateBiometric(
                    sessionId,
                    deviceId,
                    "face",
                    invalidDataHash,
                    signature
                );
            }

            await expect(
                biometricValidator.connect(validator).validateBiometric(
                    sessionId,
                    deviceId,
                    "face",
                    invalidDataHash,
                    signature
                )
            ).to.be.revertedWith("Too many attempts");
        });
    });
});