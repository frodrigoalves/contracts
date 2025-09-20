const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeviceRegistry", function () {
    let DeviceRegistry;
    let deviceRegistry;
    let owner;
    let manufacturer;
    let admin;
    let user;

    beforeEach(async function () {
        [owner, manufacturer, admin, user] = await ethers.getSigners();
        DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
        deviceRegistry = await DeviceRegistry.deploy();
        await deviceRegistry.deployed();

        // Setup roles
        const MANUFACTURER_ROLE = await deviceRegistry.MANUFACTURER_ROLE();
        const DEVICE_ADMIN_ROLE = await deviceRegistry.DEVICE_ADMIN_ROLE();
        
        await deviceRegistry.grantRole(MANUFACTURER_ROLE, manufacturer.address);
        await deviceRegistry.grantRole(DEVICE_ADMIN_ROLE, admin.address);
    });

    describe("Device Registration", function () {
        it("Should register a new device", async function () {
            const serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await expect(
                deviceRegistry.connect(manufacturer).registerDevice(
                    serialNumber,
                    deviceType,
                    user.address,
                    firmwareHash,
                    certifications,
                    publicKey
                )
            )
                .to.emit(deviceRegistry, "DeviceRegistered")
                .withArgs(
                    expect.any(String),
                    serialNumber,
                    user.address
                );

            const deviceId = ethers.utils.solidityKeccak256(
                ["string", "uint256", "address"],
                [serialNumber, (await ethers.provider.getBlock()).timestamp, user.address]
            );

            const device = await deviceRegistry.getDevice(deviceId);
            expect(device.serialNumber).to.equal(serialNumber);
            expect(device.deviceType).to.equal(deviceType);
            expect(device.owner).to.equal(user.address);
            expect(device.active).to.be.true;
        });

        it("Should not allow duplicate serial numbers", async function () {
            const serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await deviceRegistry.connect(manufacturer).registerDevice(
                serialNumber,
                deviceType,
                user.address,
                firmwareHash,
                certifications,
                publicKey
            );

            await expect(
                deviceRegistry.connect(manufacturer).registerDevice(
                    serialNumber,
                    deviceType,
                    user.address,
                    firmwareHash,
                    certifications,
                    publicKey
                )
            ).to.be.revertedWith("Device exists");
        });
    });

    describe("Device Management", function () {
        let deviceId;
        let serialNumber;

        beforeEach(async function () {
            serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await deviceRegistry.connect(manufacturer).registerDevice(
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

        it("Should update firmware hash", async function () {
            const newFirmwareHash = ethers.utils.id("1.1.0");
            await deviceRegistry.connect(admin).updateFirmware(deviceId, newFirmwareHash);
            
            const device = await deviceRegistry.getDevice(deviceId);
            expect(device.firmwareHash).to.equal(newFirmwareHash);
        });

        it("Should update device policy", async function () {
            await deviceRegistry.connect(admin).updateDevicePolicy(
                deviceId,
                true, // gpsEnabled
                true, // voiceEnabled
                true, // autoWipeEnabled
                3,   // maxFailedAttempts
                3600 // lockoutDuration
            );

            const policy = await deviceRegistry.getDevicePolicy(deviceId);
            expect(policy.gpsEnabled).to.be.true;
            expect(policy.voiceEnabled).to.be.true;
            expect(policy.maxFailedAttempts).to.equal(3);
        });

        it("Should transfer device ownership", async function () {
            const newOwner = admin.address;
            await deviceRegistry.connect(user).transferDevice(deviceId, newOwner);
            
            const device = await deviceRegistry.getDevice(deviceId);
            expect(device.owner).to.equal(newOwner);
        });

        it("Should deactivate device", async function () {
            await deviceRegistry.connect(admin).deactivateDevice(deviceId);
            
            const device = await deviceRegistry.getDevice(deviceId);
            expect(device.active).to.be.false;
        });
    });

    describe("Access Control", function () {
        it("Should only allow manufacturer to register devices", async function () {
            const serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await expect(
                deviceRegistry.connect(user).registerDevice(
                    serialNumber,
                    deviceType,
                    user.address,
                    firmwareHash,
                    certifications,
                    publicKey
                )
            ).to.be.reverted;
        });

        it("Should only allow admin to update firmware", async function () {
            const serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await deviceRegistry.connect(manufacturer).registerDevice(
                serialNumber,
                deviceType,
                user.address,
                firmwareHash,
                certifications,
                publicKey
            );

            const deviceId = ethers.utils.solidityKeccak256(
                ["string", "uint256", "address"],
                [serialNumber, (await ethers.provider.getBlock()).timestamp, user.address]
            );

            const newFirmwareHash = ethers.utils.id("1.1.0");
            await expect(
                deviceRegistry.connect(user).updateFirmware(deviceId, newFirmwareHash)
            ).to.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle empty serial number", async function () {
            const serialNumber = "";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await expect(
                deviceRegistry.connect(manufacturer).registerDevice(
                    serialNumber,
                    deviceType,
                    user.address,
                    firmwareHash,
                    certifications,
                    publicKey
                )
            ).to.be.revertedWith("Invalid serial number");
        });

        it("Should handle invalid owner address", async function () {
            const serialNumber = "SGLPEN001";
            const deviceType = "PREMIUM";
            const firmwareHash = ethers.utils.id("1.0.0");
            const certifications = "CE,FCC,ANATEL";
            const publicKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            await expect(
                deviceRegistry.connect(manufacturer).registerDevice(
                    serialNumber,
                    deviceType,
                    ethers.constants.AddressZero,
                    firmwareHash,
                    certifications,
                    publicKey
                )
            ).to.be.revertedWith("Invalid owner");
        });
    });
});