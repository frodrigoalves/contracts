const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessController", function () {
    let AccessController;
    let DeviceAuth;
    let accessController;
    let deviceAuth;
    let owner;
    let policyAdmin;
    let accessManager;
    let user;
    let deviceId;

    beforeEach(async function () {
        [owner, policyAdmin, accessManager, user] = await ethers.getSigners();

        // Deploy DeviceAuth mock
        DeviceAuth = await ethers.getContractFactory("DeviceAuth");
        deviceAuth = await DeviceAuth.deploy(
            ethers.constants.AddressZero, // Mock device registry
            ethers.constants.AddressZero  // Mock biometric validator
        );
        await deviceAuth.deployed();

        // Deploy AccessController
        AccessController = await ethers.getContractFactory("AccessController");
        accessController = await AccessController.deploy(deviceAuth.address);
        await accessController.deployed();

        // Setup roles
        const POLICY_ADMIN_ROLE = await accessController.POLICY_ADMIN_ROLE();
        const ACCESS_MANAGER_ROLE = await accessController.ACCESS_MANAGER_ROLE();
        await accessController.grantRole(POLICY_ADMIN_ROLE, policyAdmin.address);
        await accessController.grantRole(ACCESS_MANAGER_ROLE, accessManager.address);

        // Generate test device ID
        deviceId = ethers.utils.id("test_device");
    });

    describe("Default Policies", function () {
        it("Should have standard policy", async function () {
            const standardId = ethers.utils.id("STANDARD");
            const policy = await accessController.policies(standardId);
            expect(policy.policyType).to.equal("STANDARD");
            expect(policy.active).to.be.true;
        });

        it("Should have high security policy", async function () {
            const highSecurityId = ethers.utils.id("HIGH_SECURITY");
            const policy = await accessController.policies(highSecurityId);
            expect(policy.policyType).to.equal("HIGH_SECURITY");
            expect(policy.requiresGeolocation).to.be.true;
            expect(policy.requiresVoiceAuth).to.be.true;
        });

        it("Should have institutional policy", async function () {
            const institutionalId = ethers.utils.id("INSTITUTIONAL");
            const policy = await accessController.policies(institutionalId);
            expect(policy.policyType).to.equal("INSTITUTIONAL");
            expect(policy.maxFailedAttempts).to.equal(2);
        });
    });

    describe("Policy Management", function () {
        it("Should create custom policy", async function () {
            const customPolicy = {
                policyType: "CUSTOM",
                authTimeout: 300,
                sessionDuration: 3600,
                requiresGeolocation: true,
                requiresVoiceAuth: true,
                maxFailedAttempts: 3,
                lockoutDuration: 3600
            };

            await expect(
                accessController.connect(policyAdmin).createPolicy(
                    customPolicy.policyType,
                    customPolicy.authTimeout,
                    customPolicy.sessionDuration,
                    customPolicy.requiresGeolocation,
                    customPolicy.requiresVoiceAuth,
                    customPolicy.maxFailedAttempts,
                    customPolicy.lockoutDuration
                )
            ).to.emit(accessController, "PolicyCreated");
        });

        it("Should assign policy to device", async function () {
            const standardId = ethers.utils.id("STANDARD");
            await expect(
                accessController.connect(accessManager).assignPolicy(deviceId, standardId)
            )
                .to.emit(accessController, "PolicyAssigned")
                .withArgs(deviceId, standardId);
        });

        it("Should update policy settings", async function () {
            const standardId = ethers.utils.id("STANDARD");
            const newTimeout = 600;
            const newDuration = 7200;

            await accessController.connect(policyAdmin).updatePolicy(
                standardId,
                newTimeout,
                newDuration,
                true,
                true,
                5,
                3600
            );

            const policy = await accessController.policies(standardId);
            expect(policy.authTimeout).to.equal(newTimeout);
            expect(policy.sessionDuration).to.equal(newDuration);
        });
    });

    describe("Access Management", function () {
        it("Should grant access", async function () {
            const duration = 86400; // 24 hours
            const accessLevel = "READ";

            await expect(
                accessController.connect(accessManager).grantAccess(
                    deviceId,
                    user.address,
                    duration,
                    accessLevel
                )
            )
                .to.emit(accessController, "AccessGranted")
                .withArgs(deviceId, user.address, accessLevel);
        });

        it("Should revoke access", async function () {
            const duration = 86400;
            const accessLevel = "READ";

            await accessController.connect(accessManager).grantAccess(
                deviceId,
                user.address,
                duration,
                accessLevel
            );

            await expect(
                accessController.connect(accessManager).revokeAccess(deviceId, user.address)
            )
                .to.emit(accessController, "AccessRevoked")
                .withArgs(deviceId, user.address);
        });

        it("Should check access status", async function () {
            const duration = 86400;
            const accessLevel = "READ";

            await accessController.connect(accessManager).grantAccess(
                deviceId,
                user.address,
                duration,
                accessLevel
            );

            const hasAccess = await accessController.hasAccess(deviceId, user.address);
            expect(hasAccess).to.be.true;
        });

        it("Should list user grants", async function () {
            const duration = 86400;
            const accessLevel = "READ";

            await accessController.connect(accessManager).grantAccess(
                deviceId,
                user.address,
                duration,
                accessLevel
            );

            const grants = await accessController.getUserGrants(user.address);
            expect(grants).to.include(deviceId);
        });
    });

    describe("Access Control", function () {
        it("Should only allow policy admin to create policies", async function () {
            await expect(
                accessController.connect(user).createPolicy(
                    "TEST",
                    300,
                    3600,
                    false,
                    false,
                    5,
                    3600
                )
            ).to.be.reverted;
        });

        it("Should only allow access manager to grant access", async function () {
            await expect(
                accessController.connect(user).grantAccess(
                    deviceId,
                    user.address,
                    86400,
                    "READ"
                )
            ).to.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle invalid policy updates", async function () {
            const standardId = ethers.utils.id("STANDARD");
            await expect(
                accessController.connect(policyAdmin).updatePolicy(
                    standardId,
                    0, // Invalid timeout
                    3600,
                    false,
                    false,
                    5,
                    3600
                )
            ).to.be.revertedWith("Invalid timeout");
        });

        it("Should handle expired access grants", async function () {
            const duration = 1; // 1 second
            const accessLevel = "READ";

            await accessController.connect(accessManager).grantAccess(
                deviceId,
                user.address,
                duration,
                accessLevel
            );

            // Wait for grant to expire
            await ethers.provider.send("evm_increaseTime", [2]);
            await ethers.provider.send("evm_mine");

            const hasAccess = await accessController.hasAccess(deviceId, user.address);
            expect(hasAccess).to.be.false;
        });
    });
});