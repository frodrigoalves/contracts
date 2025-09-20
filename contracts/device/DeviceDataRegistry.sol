// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDeviceAuth.sol";

/**
 * @title DeviceDataRegistry
 * @dev Manages secure device data storage and access
 */
contract DeviceDataRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant DATA_ADMIN_ROLE = keccak256("DATA_ADMIN_ROLE");
    bytes32 public constant DEVICE_ROLE = keccak256("DEVICE_ROLE");

    IDeviceAuth public deviceAuth;

    struct DeviceData {
        bytes32 dataHash;
        string dataType; // "BIOMETRIC", "SECURITY", "AUDIT", "CONFIG"
        string encryptedCID;
        uint256 timestamp;
        bool sensitive;
        address owner;
        bool active;
    }

    struct DataAccess {
        address grantee;
        uint256 expiryTime;
        string accessType; // "READ", "WRITE", "ADMIN"
        bool active;
    }

    mapping(bytes32 => DeviceData) public deviceData;
    mapping(bytes32 => mapping(address => DataAccess)) public dataAccess;
    mapping(bytes32 => bytes32[]) public deviceDataLog;
    mapping(bytes32 => uint256) public dataCount;
    
    event DataStored(bytes32 indexed dataId, bytes32 indexed deviceId, string dataType);
    event DataAccessed(bytes32 indexed dataId, address indexed accessor, string accessType);
    event DataShared(bytes32 indexed dataId, address indexed grantee, uint256 expiry);
    event DataRevoked(bytes32 indexed dataId, address indexed grantee);
    event DataDeleted(bytes32 indexed dataId);

    constructor(address _deviceAuth) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DATA_ADMIN_ROLE, msg.sender);
        deviceAuth = IDeviceAuth(_deviceAuth);
    }

    /**
     * @dev Store new device data
     */
    function storeData(
        bytes32 deviceId,
        string memory dataType,
        bytes32 dataHash,
        string memory encryptedCID,
        bool sensitive
    ) external onlyRole(DEVICE_ROLE) whenNotPaused nonReentrant returns (bytes32) {
        require(bytes(dataType).length > 0, "Invalid data type");
        require(bytes(encryptedCID).length > 0, "Invalid CID");

        bytes32 dataId = keccak256(abi.encodePacked(
            deviceId,
            dataHash,
            block.timestamp
        ));

        deviceData[dataId] = DeviceData({
            dataHash: dataHash,
            dataType: dataType,
            encryptedCID: encryptedCID,
            timestamp: block.timestamp,
            sensitive: sensitive,
            owner: msg.sender,
            active: true
        });

        deviceDataLog[deviceId].push(dataId);
        dataCount[deviceId]++;

        emit DataStored(dataId, deviceId, dataType);
        return dataId;
    }

    /**
     * @dev Grant access to data
     */
    function grantAccess(
        bytes32 dataId,
        address grantee,
        uint256 duration,
        string memory accessType
    ) external {
        require(msg.sender == deviceData[dataId].owner || hasRole(DATA_ADMIN_ROLE, msg.sender), "Not authorized");
        require(deviceData[dataId].active, "Data not active");
        require(grantee != address(0), "Invalid grantee");
        require(duration > 0, "Invalid duration");

        dataAccess[dataId][grantee] = DataAccess({
            grantee: grantee,
            expiryTime: block.timestamp + duration,
            accessType: accessType,
            active: true
        });

        emit DataShared(dataId, grantee, block.timestamp + duration);
    }

    /**
     * @dev Revoke data access
     */
    function revokeAccess(bytes32 dataId, address grantee) external {
        require(msg.sender == deviceData[dataId].owner || hasRole(DATA_ADMIN_ROLE, msg.sender), "Not authorized");
        require(dataAccess[dataId][grantee].active, "No active access");

        dataAccess[dataId][grantee].active = false;
        emit DataRevoked(dataId, grantee);
    }

    /**
     * @dev Access device data
     */
    function accessData(bytes32 dataId) external view returns (
        string memory dataType,
        string memory encryptedCID,
        uint256 timestamp,
        bool sensitive
    ) {
        DeviceData memory data = deviceData[dataId];
        require(data.active, "Data not active");
        
        if (data.sensitive) {
            require(
                msg.sender == data.owner ||
                (dataAccess[dataId][msg.sender].active && block.timestamp <= dataAccess[dataId][msg.sender].expiryTime),
                "Not authorized"
            );
        }

        return (
            data.dataType,
            data.encryptedCID,
            data.timestamp,
            data.sensitive
        );
    }

    /**
     * @dev Get device data log
     */
    function getDeviceDataLog(bytes32 deviceId) external view returns (bytes32[] memory) {
        return deviceDataLog[deviceId];
    }

    /**
     * @dev Update data CID
     */
    function updateDataCID(bytes32 dataId, string memory newEncryptedCID) external {
        require(msg.sender == deviceData[dataId].owner || hasRole(DATA_ADMIN_ROLE, msg.sender), "Not authorized");
        require(deviceData[dataId].active, "Data not active");
        require(bytes(newEncryptedCID).length > 0, "Invalid CID");

        deviceData[dataId].encryptedCID = newEncryptedCID;
    }

    /**
     * @dev Delete data
     */
    function deleteData(bytes32 dataId) external {
        require(msg.sender == deviceData[dataId].owner || hasRole(DATA_ADMIN_ROLE, msg.sender), "Not authorized");
        require(deviceData[dataId].active, "Data not active");

        deviceData[dataId].active = false;
        emit DataDeleted(dataId);
    }

    /**
     * @dev Check if address has access to data
     */
    function hasAccess(bytes32 dataId, address accessor) external view returns (bool) {
        if (!deviceData[dataId].active) return false;
        if (accessor == deviceData[dataId].owner) return true;
        if (!deviceData[dataId].sensitive) return true;

        DataAccess memory access = dataAccess[dataId][accessor];
        return access.active && block.timestamp <= access.expiryTime;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(DATA_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(DATA_ADMIN_ROLE) {
        _unpause();
    }
}