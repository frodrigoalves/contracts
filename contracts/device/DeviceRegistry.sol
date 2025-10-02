// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DeviceRegistry
 * @dev Manages SingulAI Pen device registration and lifecycle
 */
contract DeviceRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant DEVICE_ADMIN_ROLE = keccak256("DEVICE_ADMIN_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");

    struct Device {
        string serialNumber;
        string deviceType; // "STANDARD", "PREMIUM"
        address owner;
        uint256 registrationDate;
        bytes32 firmwareHash;
        bool active;
        string certifications; // JSON string of certification details
        bytes publicKey; // Device's public key for authentication
    }

    struct DevicePolicy {
        bool gpsEnabled;
        bool voiceEnabled;
        bool autoWipeEnabled;
        uint256 maxFailedAttempts;
        uint256 lockoutDuration;
    }

    mapping(bytes32 => Device) public devices;
    mapping(string => bytes32) public serialToDeviceId;
    mapping(bytes32 => DevicePolicy) public devicePolicies;
    mapping(address => bytes32[]) public ownerDevices;

    event DeviceRegistered(bytes32 indexed deviceId, string serialNumber, address owner);
    event DeviceDeactivated(bytes32 indexed deviceId);
    event DevicePolicyUpdated(bytes32 indexed deviceId, bool gpsEnabled, bool voiceEnabled);
    event FirmwareUpdated(bytes32 indexed deviceId, bytes32 newFirmwareHash);
    event DeviceTransferred(bytes32 indexed deviceId, address indexed from, address indexed to);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEVICE_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new SingulAI Pen device
     */
    function registerDevice(
        string memory serialNumber,
        string memory deviceType,
        address owner,
        bytes32 firmwareHash,
        string memory certifications,
        bytes memory publicKey
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused returns (bytes32) {
        require(bytes(serialNumber).length > 0, "Invalid serial number");
        require(owner != address(0), "Invalid owner");
        require(serialToDeviceId[serialNumber] == bytes32(0), "Device exists");

        bytes32 deviceId = keccak256(abi.encodePacked(
            serialNumber,
            block.timestamp,
            owner
        ));

        devices[deviceId] = Device({
            serialNumber: serialNumber,
            deviceType: deviceType,
            owner: owner,
            registrationDate: block.timestamp,
            firmwareHash: firmwareHash,
            active: true,
            certifications: certifications,
            publicKey: publicKey
        });

        serialToDeviceId[serialNumber] = deviceId;
        ownerDevices[owner].push(deviceId);

        // Set default policy
        devicePolicies[deviceId] = DevicePolicy({
            gpsEnabled: false,
            voiceEnabled: true,
            autoWipeEnabled: true,
            maxFailedAttempts: 5,
            lockoutDuration: 1 hours
        });

        emit DeviceRegistered(deviceId, serialNumber, owner);
        return deviceId;
    }

    /**
     * @dev Update device firmware hash
     */
    function updateFirmware(bytes32 deviceId, bytes32 newFirmwareHash) 
        external 
        onlyRole(DEVICE_ADMIN_ROLE) 
    {
        require(devices[deviceId].active, "Device not active");
        devices[deviceId].firmwareHash = newFirmwareHash;
        emit FirmwareUpdated(deviceId, newFirmwareHash);
    }

    /**
     * @dev Update device policy settings
     */
    function updateDevicePolicy(
        bytes32 deviceId,
        bool gpsEnabled,
        bool voiceEnabled,
        bool autoWipeEnabled,
        uint256 maxFailedAttempts,
        uint256 lockoutDuration
    ) external {
        require(msg.sender == devices[deviceId].owner || hasRole(DEVICE_ADMIN_ROLE, msg.sender), "Not authorized");
        require(devices[deviceId].active, "Device not active");
        require(maxFailedAttempts > 0, "Invalid attempts");
        require(lockoutDuration > 0, "Invalid duration");

        devicePolicies[deviceId] = DevicePolicy({
            gpsEnabled: gpsEnabled,
            voiceEnabled: voiceEnabled,
            autoWipeEnabled: autoWipeEnabled,
            maxFailedAttempts: maxFailedAttempts,
            lockoutDuration: lockoutDuration
        });

        emit DevicePolicyUpdated(deviceId, gpsEnabled, voiceEnabled);
    }

    /**
     * @dev Transfer device ownership
     */
    function transferDevice(bytes32 deviceId, address newOwner) external nonReentrant {
        require(msg.sender == devices[deviceId].owner, "Not owner");
        require(newOwner != address(0), "Invalid new owner");
        require(devices[deviceId].active, "Device not active");

        address oldOwner = devices[deviceId].owner;
        devices[deviceId].owner = newOwner;
        
        // Update owner device mappings
        ownerDevices[newOwner].push(deviceId);
        
        emit DeviceTransferred(deviceId, oldOwner, newOwner);
    }

    /**
     * @dev Deactivate a device
     */
    function deactivateDevice(bytes32 deviceId) external {
        require(
            msg.sender == devices[deviceId].owner || 
            hasRole(DEVICE_ADMIN_ROLE, msg.sender), 
            "Not authorized"
        );
        require(devices[deviceId].active, "Already deactivated");

        devices[deviceId].active = false;
        emit DeviceDeactivated(deviceId);
    }

    /**
     * @dev Get device details
     */
    function getDevice(bytes32 deviceId) external view returns (
        string memory serialNumber,
        string memory deviceType,
        address owner,
        uint256 registrationDate,
        bytes32 firmwareHash,
        bool active,
        string memory certifications,
        bytes memory publicKey
    ) {
        Device memory device = devices[deviceId];
        return (
            device.serialNumber,
            device.deviceType,
            device.owner,
            device.registrationDate,
            device.firmwareHash,
            device.active,
            device.certifications,
            device.publicKey
        );
    }

    /**
     * @dev Get device policy
     */
    function getDevicePolicy(bytes32 deviceId) external view returns (
        bool gpsEnabled,
        bool voiceEnabled,
        bool autoWipeEnabled,
        uint256 maxFailedAttempts,
        uint256 lockoutDuration
    ) {
        DevicePolicy memory policy = devicePolicies[deviceId];
        return (
            policy.gpsEnabled,
            policy.voiceEnabled,
            policy.autoWipeEnabled,
            policy.maxFailedAttempts,
            policy.lockoutDuration
        );
    }

    /**
     * @dev Get devices owned by an address
     */
    function getOwnerDevices(address owner) external view returns (bytes32[] memory) {
        return ownerDevices[owner];
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(DEVICE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(DEVICE_ADMIN_ROLE) {
        _unpause();
    }
}