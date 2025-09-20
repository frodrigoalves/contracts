// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IDeviceRegistry.sol";
import "./interfaces/IBiometricValidator.sol";

/**
 * @title DeviceAuth
 * @dev Manages authentication and security for SingulAI Pen devices
 */
contract DeviceAuth is AccessControl, Pausable {
    using ECDSA for bytes32;

    bytes32 public constant AUTH_ADMIN_ROLE = keccak256("AUTH_ADMIN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    IDeviceRegistry public deviceRegistry;
    IBiometricValidator public biometricValidator;

    struct AuthSession {
        bytes32 deviceId;
        uint256 startTime;
        uint256 expiryTime;
        bool active;
        bytes32 biometricSessionId;
        bytes32 challengeHash;
        bool challengeCompleted;
    }

    struct SecurityEvent {
        string eventType;
        uint256 timestamp;
        bytes32 proofHash;
        bool requiresAction;
        bool resolved;
    }

    mapping(bytes32 => AuthSession) public authSessions;
    mapping(bytes32 => mapping(uint256 => SecurityEvent)) public securityEvents;
    mapping(bytes32 => uint256) public securityEventCount;
    mapping(bytes32 => bool) public deviceLocked;
    mapping(bytes32 => uint256) public lockoutExpiry;

    event AuthSessionStarted(bytes32 indexed sessionId, bytes32 indexed deviceId);
    event AuthSessionCompleted(bytes32 indexed sessionId, bool success);
    event SecurityEventLogged(bytes32 indexed deviceId, string eventType, bytes32 proofHash);
    event DeviceLocked(bytes32 indexed deviceId, uint256 until);
    event DeviceUnlocked(bytes32 indexed deviceId);

    constructor(address _deviceRegistry, address _biometricValidator) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(AUTH_ADMIN_ROLE, msg.sender);
        deviceRegistry = IDeviceRegistry(_deviceRegistry);
        biometricValidator = IBiometricValidator(_biometricValidator);
    }

    /**
     * @dev Start a new authentication session
     */
    function startAuthSession(bytes32 deviceId) external whenNotPaused returns (bytes32) {
        require(!deviceLocked[deviceId], "Device locked");
        
        bytes32 sessionId = keccak256(abi.encodePacked(
            deviceId,
            block.timestamp,
            msg.sender
        ));

        bytes32 biometricSessionId = biometricValidator.startValidation(deviceId);
        bytes32 challengeHash = generateChallenge(deviceId);

        authSessions[sessionId] = AuthSession({
            deviceId: deviceId,
            startTime: block.timestamp,
            expiryTime: block.timestamp + 5 minutes,
            active: true,
            biometricSessionId: biometricSessionId,
            challengeHash: challengeHash,
            challengeCompleted: false
        });

        emit AuthSessionStarted(sessionId, deviceId);
        return sessionId;
    }

    /**
     * @dev Complete authentication session
     */
    function completeAuthSession(
        bytes32 sessionId,
        bytes memory challengeResponse,
        bytes memory signature
    ) external whenNotPaused returns (bool) {
        AuthSession storage session = authSessions[sessionId];
        require(session.active, "Session not active");
        require(block.timestamp < session.expiryTime, "Session expired");
        require(!session.challengeCompleted, "Challenge completed");

        bool biometricValid = biometricValidator.completeValidation(
            session.biometricSessionId,
            session.deviceId
        );

        if (!biometricValid) {
            logSecurityEvent(session.deviceId, "BIOMETRIC_FAILURE", "");
            return false;
        }

        bool challengeValid = validateChallenge(
            session.deviceId,
            session.challengeHash,
            challengeResponse,
            signature
        );

        if (!challengeValid) {
            logSecurityEvent(session.deviceId, "CHALLENGE_FAILURE", "");
            return false;
        }

        session.challengeCompleted = true;
        session.active = false;

        emit AuthSessionCompleted(sessionId, true);
        return true;
    }

    /**
     * @dev Generate authentication challenge
     */
    function generateChallenge(bytes32 deviceId) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            deviceId,
            block.timestamp,
            block.difficulty,
            msg.sender
        ));
    }

    /**
     * @dev Validate challenge response
     */
    function validateChallenge(
        bytes32 deviceId,
        bytes32 challengeHash,
        bytes memory response,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 responseHash = keccak256(abi.encodePacked(challengeHash, response));
        address signer = responseHash.toEthSignedMessageHash().recover(signature);
        
        (, bytes memory devicePublicKey) = deviceRegistry.getDevice(deviceId);
        require(devicePublicKey.length > 0, "Invalid device");

        return keccak256(abi.encodePacked(signer)) == keccak256(devicePublicKey);
    }

    /**
     * @dev Log security event
     */
    function logSecurityEvent(
        bytes32 deviceId,
        string memory eventType,
        string memory proofData
    ) public onlyRole(VALIDATOR_ROLE) {
        bytes32 proofHash = keccak256(abi.encodePacked(eventType, proofData, block.timestamp));
        uint256 eventId = securityEventCount[deviceId] + 1;
        
        securityEvents[deviceId][eventId] = SecurityEvent({
            eventType: eventType,
            timestamp: block.timestamp,
            proofHash: proofHash,
            requiresAction: true,
            resolved: false
        });

        securityEventCount[deviceId] = eventId;
        
        // Auto-lock device if too many security events
        if (eventId >= 3) {
            lockDevice(deviceId);
        }

        emit SecurityEventLogged(deviceId, eventType, proofHash);
    }

    /**
     * @dev Lock device
     */
    function lockDevice(bytes32 deviceId) public onlyRole(AUTH_ADMIN_ROLE) {
        require(!deviceLocked[deviceId], "Already locked");
        
        deviceLocked[deviceId] = true;
        lockoutExpiry[deviceId] = block.timestamp + 24 hours;
        
        emit DeviceLocked(deviceId, lockoutExpiry[deviceId]);
    }

    /**
     * @dev Unlock device
     */
    function unlockDevice(bytes32 deviceId) external onlyRole(AUTH_ADMIN_ROLE) {
        require(deviceLocked[deviceId], "Not locked");
        require(block.timestamp >= lockoutExpiry[deviceId], "Lockout active");
        
        deviceLocked[deviceId] = false;
        delete lockoutExpiry[deviceId];
        
        emit DeviceUnlocked(deviceId);
    }

    /**
     * @dev Resolve security event
     */
    function resolveSecurityEvent(bytes32 deviceId, uint256 eventId) external onlyRole(AUTH_ADMIN_ROLE) {
        require(securityEvents[deviceId][eventId].requiresAction, "No action required");
        securityEvents[deviceId][eventId].resolved = true;
        securityEvents[deviceId][eventId].requiresAction = false;
    }

    /**
     * @dev Get security events for device
     */
    function getSecurityEvents(bytes32 deviceId) external view returns (
        string[] memory eventTypes,
        uint256[] memory timestamps,
        bytes32[] memory proofHashes,
        bool[] memory requiresAction,
        bool[] memory resolved
    ) {
        uint256 count = securityEventCount[deviceId];
        eventTypes = new string[](count);
        timestamps = new uint256[](count);
        proofHashes = new bytes32[](count);
        requiresAction = new bool[](count);
        resolved = new bool[](count);

        for (uint256 i = 1; i <= count; i++) {
            SecurityEvent storage event_ = securityEvents[deviceId][i];
            eventTypes[i-1] = event_.eventType;
            timestamps[i-1] = event_.timestamp;
            proofHashes[i-1] = event_.proofHash;
            requiresAction[i-1] = event_.requiresAction;
            resolved[i-1] = event_.resolved;
        }
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(AUTH_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(AUTH_ADMIN_ROLE) {
        _unpause();
    }
}