const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeviceDataRegistry", function () {
    let DeviceDataRegistry;
    let AccessController;
    let deviceDataRegistry;
    let accessController;
    let owner;
    let dataManager;
    let user;
    let deviceId;

    beforeEach(async function () {
        [owner, dataManager, user] = await ethers.getSigners();

        // Deploy mock AccessController
        AccessController = await ethers.getContractFactory("AccessController");
        accessController = await AccessController.deploy(ethers.constants.AddressZero);
        await accessController.deployed();

        // Deploy DeviceDataRegistry
        DeviceDataRegistry = await ethers.getContractFactory("DeviceDataRegistry");
        deviceDataRegistry = await DeviceDataRegistry.deploy(accessController.address);
        await deviceDataRegistry.deployed();

        // Setup roles
        const DATA_MANAGER_ROLE = await deviceDataRegistry.DATA_MANAGER_ROLE();
        await deviceDataRegistry.grantRole(DATA_MANAGER_ROLE, dataManager.address);

        // Generate test device ID
        deviceId = ethers.utils.id("test_device");
    });

    describe("Data Storage", function () {
        it("Should store device metrics", async function () {
            const metrics = {
                timestamp: Math.floor(Date.now() / 1000),
                batteryLevel: 85,
                temperature: 25,
                pressure: 1013,
                connectivity: 4
            };

            await expect(
                deviceDataRegistry.connect(dataManager).storeMetrics(
                    deviceId,
                    metrics.timestamp,
                    metrics.batteryLevel,
                    metrics.temperature,
                    metrics.pressure,
                    metrics.connectivity
                )
            )
                .to.emit(deviceDataRegistry, "MetricsStored")
                .withArgs(deviceId, metrics.timestamp);

            const storedMetrics = await deviceDataRegistry.getLatestMetrics(deviceId);
            expect(storedMetrics.timestamp).to.equal(metrics.timestamp);
            expect(storedMetrics.batteryLevel).to.equal(metrics.batteryLevel);
        });

        it("Should store usage data", async function () {
            const usage = {
                timestamp: Math.floor(Date.now() / 1000),
                sessionDuration: 3600,
                featuresUsed: ["biometric", "voice"],
                successfulAuth: true
            };

            await expect(
                deviceDataRegistry.connect(dataManager).storeUsageData(
                    deviceId,
                    usage.timestamp,
                    usage.sessionDuration,
                    usage.featuresUsed,
                    usage.successfulAuth
                )
            )
                .to.emit(deviceDataRegistry, "UsageDataStored")
                .withArgs(deviceId, usage.timestamp);

            const storedUsage = await deviceDataRegistry.getLatestUsage(deviceId);
            expect(storedUsage.timestamp).to.equal(usage.timestamp);
            expect(storedUsage.sessionDuration).to.equal(usage.sessionDuration);
        });

        it("Should store diagnostic data", async function () {
            const diagnostic = {
                timestamp: Math.floor(Date.now() / 1000),
                status: "HEALTHY",
                lastMaintenance: Math.floor(Date.now() / 1000) - 86400,
                issues: []
            };

            await expect(
                deviceDataRegistry.connect(dataManager).storeDiagnostics(
                    deviceId,
                    diagnostic.timestamp,
                    diagnostic.status,
                    diagnostic.lastMaintenance,
                    diagnostic.issues
                )
            )
                .to.emit(deviceDataRegistry, "DiagnosticsStored")
                .withArgs(deviceId, diagnostic.timestamp);

            const storedDiagnostic = await deviceDataRegistry.getLatestDiagnostics(deviceId);
            expect(storedDiagnostic.timestamp).to.equal(diagnostic.timestamp);
            expect(storedDiagnostic.status).to.equal(diagnostic.status);
        });
    });

    describe("Data Retrieval", function () {
        beforeEach(async function () {
            // Store some test data
            await deviceDataRegistry.connect(dataManager).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000),
                85,
                25,
                1013,
                4
            );
        });

        it("Should retrieve metrics history", async function () {
            const history = await deviceDataRegistry.getMetricsHistory(deviceId);
            expect(history.length).to.be.above(0);
        });

        it("Should retrieve usage statistics", async function () {
            const stats = await deviceDataRegistry.getUsageStatistics(deviceId);
            expect(stats).to.have.property("totalSessions");
        });

        it("Should retrieve maintenance history", async function () {
            const maintenance = await deviceDataRegistry.getMaintenanceHistory(deviceId);
            expect(maintenance).to.be.an("array");
        });
    });

    describe("Data Analysis", function () {
        it("Should calculate device health score", async function () {
            // Store test metrics and diagnostics
            await deviceDataRegistry.connect(dataManager).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000),
                85,
                25,
                1013,
                4
            );

            await deviceDataRegistry.connect(dataManager).storeDiagnostics(
                deviceId,
                Math.floor(Date.now() / 1000),
                "HEALTHY",
                Math.floor(Date.now() / 1000) - 86400,
                []
            );

            const healthScore = await deviceDataRegistry.calculateHealthScore(deviceId);
            expect(healthScore).to.be.above(0);
        });

        it("Should detect anomalies", async function () {
            // Store abnormal metrics
            await deviceDataRegistry.connect(dataManager).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000),
                20, // Low battery
                45, // High temperature
                900, // Low pressure
                1   // Poor connectivity
            );

            const anomalies = await deviceDataRegistry.detectAnomalies(deviceId);
            expect(anomalies.length).to.be.above(0);
        });
    });

    describe("Access Control", function () {
        it("Should only allow data manager to store data", async function () {
            await expect(
                deviceDataRegistry.connect(user).storeMetrics(
                    deviceId,
                    Math.floor(Date.now() / 1000),
                    85,
                    25,
                    1013,
                    4
                )
            ).to.be.reverted;
        });

        it("Should respect access control for data retrieval", async function () {
            await expect(
                deviceDataRegistry.connect(user).getMetricsHistory(deviceId)
            ).to.be.revertedWith("Access denied");
        });
    });

    describe("Data Validation", function () {
        it("Should validate metric ranges", async function () {
            await expect(
                deviceDataRegistry.connect(dataManager).storeMetrics(
                    deviceId,
                    Math.floor(Date.now() / 1000),
                    101, // Invalid battery level
                    25,
                    1013,
                    4
                )
            ).to.be.revertedWith("Invalid metric value");
        });

        it("Should validate timestamp order", async function () {
            const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;
            
            // Store first metric
            await deviceDataRegistry.connect(dataManager).storeMetrics(
                deviceId,
                Math.floor(Date.now() / 1000),
                85,
                25,
                1013,
                4
            );

            // Try to store metric with past timestamp
            await expect(
                deviceDataRegistry.connect(dataManager).storeMetrics(
                    deviceId,
                    pastTimestamp,
                    85,
                    25,
                    1013,
                    4
                )
            ).to.be.revertedWith("Invalid timestamp");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle missing data gracefully", async function () {
            const nonExistentDevice = ethers.utils.id("non_existent_device");
            const metrics = await deviceDataRegistry.getLatestMetrics(nonExistentDevice);
            expect(metrics.timestamp).to.equal(0);
        });

        it("Should handle data overflow", async function () {
            // Store maximum number of metrics
            for (let i = 0; i < 100; i++) {
                await deviceDataRegistry.connect(dataManager).storeMetrics(
                    deviceId,
                    Math.floor(Date.now() / 1000) + i,
                    85,
                    25,
                    1013,
                    4
                );
            }

            const history = await deviceDataRegistry.getMetricsHistory(deviceId);
            expect(history.length).to.be.lte(100); // Assuming max history is 100
        });
    });
});