const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Device Integration Tests", function () {
    let DeviceRegistry;
    let BiometricValidator;
    let DeviceAuth;
    let AccessController;
    let DeviceDataRegistry;
    
    let deviceRegistry;
    let biometricValidator;
    let deviceAuth;
    let accessController;
    let deviceDataRegistry;
    
    let owner;
    let manufacturer;
    let institution;
    let user;
    let deviceId;

    before(async function () {
        [owner, manufacturer, institution, user] = await ethers.getSigners();
        
        // Deploy full contract suite
        DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
        deviceRegistry = await DeviceRegistry.deploy();
        await deviceRegistry.deployed();

        BiometricValidator = await ethers.getContractFactory("BiometricValidator");
        biometricValidator = await BiometricValidator.deploy();
        await biometricValidator.deployed();

        DeviceAuth = await ethers.getContractFactory("DeviceAuth");
        deviceAuth = await DeviceAuth.deploy(
            deviceRegistry.address,
            biometricValidator.address
        );
        await deviceAuth.deployed();

        AccessController = await ethers.getContractFactory("AccessController");
        accessController = await AccessController.deploy(deviceAuth.address);
        await accessController.deployed();

        DeviceDataRegistry = await ethers.getContractFactory("DeviceDataRegistry");
        deviceDataRegistry = await DeviceDataRegistry.deploy(accessController.address);
        await deviceDataRegistry.deployed();

        // Setup roles
        const MANUFACTURER_ROLE = await deviceRegistry.MANUFACTURER_ROLE();
        const INSTITUTION_ROLE = await deviceRegistry.INSTITUTION_ROLE();
        await deviceRegistry.grantRole(MANUFACTURER_ROLE, manufacturer.address);
        await deviceRegistry.grantRole(INSTITUTION_ROLE, institution.address);

        // Generate device ID
        deviceId = ethers.utils.id("premium_device_001");
    });

    describe("Complete Device Lifecycle", function () {
        it("Should execute full device registration and setup flow", async function () {
            // 1. Manufacturer registers device
            await deviceRegistry.connect(manufacturer).registerDevice(
                deviceId,
                "Premium SingulAI Pen",
                "v2.0",
                "HIGH_SECURITY"
            );

            // 2. Set device specifications
            await deviceRegistry.connect(manufacturer).setDeviceSpecs(
                deviceId,
                ["biometric", "voice", "geolocation"],
                ["RSA-4096", "ECC-P256"],
                "TPM-2.0"
            );

            // 3. Institution claims device
            await deviceRegistry.connect(institution).claimDevice(deviceId);

            // 4. Setup biometric validation
            const biometricTemplate = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            await biometricValidator.connect(institution).registerTemplate(
                deviceId,
                biometricTemplate,
                "FINGERPRINT"
            );

            // 5. Configure access policy
            const highSecurityId = ethers.utils.id("HIGH_SECURITY");
            await accessController.connect(institution).assignPolicy(deviceId, highSecurityId);

            // Verify full setup
            const device = await deviceRegistry.devices(deviceId);
            expect(device.status).to.equal("ACTIVE");
            expect(device.owner).to.equal(institution.address);
        });

        it("Should handle complete authentication and data collection cycle", async function () {
            // 1. Start authentication session
            const sessionId = ethers.utils.id("session_001");
            await deviceAuth.connect(user).initiateAuth(deviceId);

            // 2. Submit biometric validation
            const validationData = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            await biometricValidator.connect(user).submitValidation(
                deviceId,
                sessionId,
                validationData
            );

            // 3. Complete authentication
            await deviceAuth.connect(user).completeAuth(deviceId, sessionId);

            // 4. Record device metrics
            const timestamp = Math.floor(Date.now() / 1000);
            await deviceDataRegistry.connect(institution).storeMetrics(
                deviceId,
                timestamp,
                95, // battery
                23, // temperature
                1015, // pressure
                5    // connectivity
            );

            // 5. Store usage data
            await deviceDataRegistry.connect(institution).storeUsageData(
                deviceId,
                timestamp,
                1800, // 30 min session
                ["biometric", "voice"],
                true
            );

            // Verify data collection
            const metrics = await deviceDataRegistry.getLatestMetrics(deviceId);
            expect(metrics.batteryLevel).to.equal(95);
            const status = await deviceAuth.getAuthStatus(deviceId);
            expect(status.isAuthenticated).to.be.true;
        });
    });

    describe("Advanced Security Scenarios", function () {
        it("Should handle multiple authentication attempts with lockout", async function () {
            const maxAttempts = 3;
            let sessionId;

            // Attempt multiple failed authentications
            for (let i = 0; i < maxAttempts; i++) {
                sessionId = ethers.utils.id(`failed_session_${i}`);
                await deviceAuth.connect(user).initiateAuth(deviceId);
                
                // Submit invalid biometric data
                const invalidData = ethers.utils.hexlify(ethers.utils.randomBytes(32));
                await biometricValidator.connect(user).submitValidation(
                    deviceId,
                    sessionId,
                    invalidData
                );

                // Try to complete auth (should fail)
                await expect(
                    deviceAuth.connect(user).completeAuth(deviceId, sessionId)
                ).to.be.reverted;
            }

            // Verify device is locked
            const status = await deviceAuth.getAuthStatus(deviceId);
            expect(status.isLocked).to.be.true;
        });

        it("Should enforce policy-based access controls", async function () {
            // Setup custom high-security policy
            const policyId = ethers.utils.id("ULTRA_SECURE");
            await accessController.connect(institution).createPolicy(
                "ULTRA_SECURE",
                120,    // 2 min timeout
                1800,   // 30 min session
                true,   // requires geolocation
                true,   // requires voice
                2,      // max attempts
                7200    // 2 hour lockout
            );

            // Assign new policy
            await accessController.connect(institution).assignPolicy(deviceId, policyId);

            // Attempt access without meeting requirements
            const sessionId = ethers.utils.id("policy_test_session");
            await deviceAuth.connect(user).initiateAuth(deviceId);

            // Should fail due to missing requirements
            await expect(
                deviceAuth.connect(user).completeAuth(deviceId, sessionId)
            ).to.be.revertedWith("Policy requirements not met");
        });
    });

    describe("Device Health Monitoring", function () {
        it("Should detect and report anomalies", async function () {
            // Record normal metrics
            await deviceDataRegistry.connect(institution).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000),
                85,  // normal battery
                25,  // normal temp
                1013, // normal pressure
                4    // good connectivity
            );

            // Record anomalous metrics
            await deviceDataRegistry.connect(institution).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000) + 300,
                20,  // low battery
                45,  // high temp
                900, // low pressure
                1    // poor connectivity
            );

            // Check anomaly detection
            const anomalies = await deviceDataRegistry.detectAnomalies(deviceId);
            expect(anomalies.length).to.be.above(0);

            // Calculate health score
            const healthScore = await deviceDataRegistry.calculateHealthScore(deviceId);
            expect(healthScore).to.be.below(80); // Assuming 100 is perfect health
        });

        it("Should track maintenance history", async function () {
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Record diagnostic data
            await deviceDataRegistry.connect(institution).storeDiagnostics(
                deviceId,
                timestamp,
                "MAINTENANCE_REQUIRED",
                timestamp - 86400 * 30, // Last maintenance 30 days ago
                ["battery_degradation", "sensor_calibration_needed"]
            );

            // Verify maintenance tracking
            const history = await deviceDataRegistry.getMaintenanceHistory(deviceId);
            expect(history.length).to.be.above(0);
            expect(history[history.length - 1].status).to.equal("MAINTENANCE_REQUIRED");
        });
    });

    describe("Institutional Operations", function () {
        it("Should handle device transfer between institutions", async function () {
            const [, , , , newInstitution] = await ethers.getSigners();
            
            // Grant institution role to new institution
            const INSTITUTION_ROLE = await deviceRegistry.INSTITUTION_ROLE();
            await deviceRegistry.grantRole(INSTITUTION_ROLE, newInstitution.address);

            // Initiate transfer
            await deviceRegistry.connect(institution).initiateTransfer(
                deviceId,
                newInstitution.address
            );

            // Accept transfer
            await deviceRegistry.connect(newInstitution).acceptTransfer(deviceId);

            // Verify new ownership
            const device = await deviceRegistry.devices(deviceId);
            expect(device.owner).to.equal(newInstitution.address);
        });

        it("Should manage multi-user access configurations", async function () {
            const [, , , , , user1, user2, user3] = await ethers.getSigners();
            
            // Grant access to multiple users
            await Promise.all([
                accessController.connect(institution).grantAccess(
                    deviceId,
                    user1.address,
                    86400,
                    "READ"
                ),
                accessController.connect(institution).grantAccess(
                    deviceId,
                    user2.address,
                    86400,
                    "WRITE"
                ),
                accessController.connect(institution).grantAccess(
                    deviceId,
                    user3.address,
                    86400,
                    "ADMIN"
                )
            ]);

            // Verify access levels
            for (const user of [user1, user2, user3]) {
                const hasAccess = await accessController.hasAccess(deviceId, user.address);
                expect(hasAccess).to.be.true;
            }
        });
    });

    describe("Performance and Limits", function () {
        it("Should handle high-frequency data collection", async function () {
            // Simulate rapid data collection (100 metrics in quick succession)
            const promises = [];
            const baseTimestamp = Math.floor(Date.now() / 1000);
            
            for (let i = 0; i < 100; i++) {
                promises.push(
                    deviceDataRegistry.connect(institution).storeMetrics(
                        deviceId,
                        baseTimestamp + i,
                        85 - (i % 10),  // Varying battery
                        25 + (i % 5),   // Varying temperature
                        1013,           // Stable pressure
                        4               // Stable connectivity
                    )
                );
            }

            await Promise.all(promises);

            // Verify data storage and retrieval
            const history = await deviceDataRegistry.getMetricsHistory(deviceId);
            expect(history.length).to.equal(100);
        });

        it("Should maintain system stability under stress", async function () {
            // Simulate concurrent authentication sessions
            const sessions = [];
            for (let i = 0; i < 10; i++) {
                const sessionId = ethers.utils.id(`stress_session_${i}`);
                sessions.push(
                    (async () => {
                        await deviceAuth.connect(user).initiateAuth(deviceId);
                        await biometricValidator.connect(user).submitValidation(
                            deviceId,
                            sessionId,
                            ethers.utils.hexlify(ethers.utils.randomBytes(32))
                        );
                        return deviceAuth.connect(user).completeAuth(deviceId, sessionId);
                    })()
                );
            }

            // All sessions should complete without errors
            await Promise.all(sessions);

            // System should remain stable
            const status = await deviceAuth.getAuthStatus(deviceId);
            expect(status.isActive).to.be.true;
        });
    });
});