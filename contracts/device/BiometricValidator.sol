// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IDeviceRegistry.sol";

/**
 * @title BiometricValidator
 * @dev Validates multimodal biometric data from SingulAI Pen devices
 */
contract BiometricValidator is AccessControl, Pausable {
    using ECDSA for bytes32;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IDeviceRegistry public deviceRegistry;

    struct BiometricTemplate {
        bytes32 faceHash;
        bytes32 fingerprintHash;
        bytes32 gestureHash;
        uint256 lastUpdate;
        bool active;
        bool voiceEnabled;
        bytes32 voiceHash;
    }

    struct ValidationSession {
        uint256 startTime;
        uint256 attempts;
        bool faceValid;
        bool fingerprintValid;
        bool gestureValid;
        bool voiceValid;
        bool completed;
    }

    mapping(bytes32 => BiometricTemplate) public templates;
    mapping(bytes32 => ValidationSession) public sessions;
    mapping(bytes32 => mapping(uint256 => bytes32)) public validationLogs;
    mapping(bytes32 => uint256) public failedAttempts;

    event TemplateRegistered(bytes32 indexed deviceId, uint256 timestamp);
    event ValidationStarted(bytes32 indexed sessionId, bytes32 indexed deviceId);
    event BiometricValidated(bytes32 indexed sessionId, string biometricType, bool success);
    event SessionCompleted(bytes32 indexed sessionId, bool success);
    event FailedAttemptLogged(bytes32 indexed deviceId, bytes32 sessionId);

    constructor(address _deviceRegistry) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        deviceRegistry = IDeviceRegistry(_deviceRegistry);
    }

    /**
     * @dev Register biometric template for a device
     */
    function registerTemplate(
        bytes32 deviceId,
        bytes32 faceHash,
        bytes32 fingerprintHash,
        bytes32 gestureHash,
        bytes32 voiceHash,
        bool voiceEnabled
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        require(templates[deviceId].lastUpdate == 0, "Template exists");
        
        templates[deviceId] = BiometricTemplate({
            faceHash: faceHash,
            fingerprintHash: fingerprintHash,
            gestureHash: gestureHash,
            lastUpdate: block.timestamp,
            active: true,
            voiceEnabled: voiceEnabled,
            voiceHash: voiceHash
        });

        emit TemplateRegistered(deviceId, block.timestamp);
    }

    /**
     * @dev Start a new validation session
     */
    function startValidation(bytes32 deviceId) external whenNotPaused returns (bytes32) {
        require(templates[deviceId].active, "Template not active");
        
        bytes32 sessionId = keccak256(abi.encodePacked(
            deviceId,
            block.timestamp,
            msg.sender
        ));

        sessions[sessionId] = ValidationSession({
            startTime: block.timestamp,
            attempts: 0,
            faceValid: false,
            fingerprintValid: false,
            gestureValid: false,
            voiceValid: false,
            completed: false
        });

        emit ValidationStarted(sessionId, deviceId);
        return sessionId;
    }

    /**
     * @dev Validate individual biometric factor
     */
    function validateBiometric(
        bytes32 sessionId,
        bytes32 deviceId,
        string memory biometricType,
        bytes32 dataHash,
        bytes memory signature
    ) external whenNotPaused returns (bool) {
        ValidationSession storage session = sessions[sessionId];
        require(session.startTime > 0, "Invalid session");
        require(!session.completed, "Session completed");
        require(session.attempts < 3, "Too many attempts");

        bool isValid = verifyBiometricData(deviceId, biometricType, dataHash, signature);
        session.attempts++;

        if (isValid) {
            if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("face"))) {
                session.faceValid = true;
            } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("fingerprint"))) {
                session.fingerprintValid = true;
            } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("gesture"))) {
                session.gestureValid = true;
            } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("voice"))) {
                if (templates[deviceId].voiceEnabled) {
                    session.voiceValid = true;
                }
            }
        } else {
            logFailedAttempt(deviceId, sessionId, dataHash);
        }

        emit BiometricValidated(sessionId, biometricType, isValid);
        return isValid;
    }

    /**
     * @dev Complete validation session
     */
    function completeValidation(bytes32 sessionId, bytes32 deviceId) external whenNotPaused returns (bool) {
        ValidationSession storage session = sessions[sessionId];
        require(session.startTime > 0, "Invalid session");
        require(!session.completed, "Already completed");

        bool success = session.faceValid && session.fingerprintValid && session.gestureValid;
        if (templates[deviceId].voiceEnabled) {
            success = success && session.voiceValid;
        }

        session.completed = true;
        emit SessionCompleted(sessionId, success);
        return success;
    }

    /**
     * @dev Verify biometric data against stored template
     */
    function verifyBiometricData(
        bytes32 deviceId,
        string memory biometricType,
        bytes32 dataHash,
        bytes memory signature
    ) internal view returns (bool) {
        BiometricTemplate storage template = templates[deviceId];
        bytes32 templateHash;

        if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("face"))) {
            templateHash = template.faceHash;
        } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("fingerprint"))) {
            templateHash = template.fingerprintHash;
        } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("gesture"))) {
            templateHash = template.gestureHash;
        } else if (keccak256(abi.encodePacked(biometricType)) == keccak256(abi.encodePacked("voice"))) {
            templateHash = template.voiceHash;
        } else {
            return false;
        }

        bytes32 messageHash = keccak256(abi.encodePacked(dataHash, deviceId));
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        
        (, bytes memory devicePublicKey) = deviceRegistry.getDevice(deviceId);
        require(devicePublicKey.length > 0, "Invalid device");

        return keccak256(abi.encodePacked(signer)) == keccak256(devicePublicKey);
    }

    /**
     * @dev Log failed authentication attempt
     */
    function logFailedAttempt(bytes32 deviceId, bytes32 sessionId, bytes32 dataHash) internal {
        failedAttempts[deviceId]++;
        validationLogs[deviceId][failedAttempts[deviceId]] = dataHash;
        emit FailedAttemptLogged(deviceId, sessionId);
    }

    /**
     * @dev Update biometric template
     */
    function updateTemplate(
        bytes32 deviceId,
        bytes32 faceHash,
        bytes32 fingerprintHash,
        bytes32 gestureHash,
        bytes32 voiceHash,
        bool voiceEnabled
    ) external onlyRole(VALIDATOR_ROLE) {
        require(templates[deviceId].active, "Template not active");
        
        templates[deviceId] = BiometricTemplate({
            faceHash: faceHash,
            fingerprintHash: fingerprintHash,
            gestureHash: gestureHash,
            lastUpdate: block.timestamp,
            active: true,
            voiceEnabled: voiceEnabled,
            voiceHash: voiceHash
        });
    }

    /**
     * @dev Deactivate biometric template
     */
    function deactivateTemplate(bytes32 deviceId) external onlyRole(ADMIN_ROLE) {
        require(templates[deviceId].active, "Already deactivated");
        templates[deviceId].active = false;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}