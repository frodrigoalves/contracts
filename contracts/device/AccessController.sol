// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IDeviceAuth.sol";

/**
 * @title AccessController
 * @dev Manages access policies and permissions for SingulAI Pen devices
 */
contract AccessController is AccessControl, Pausable {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant ACCESS_MANAGER_ROLE = keccak256("ACCESS_MANAGER_ROLE");

    IDeviceAuth public deviceAuth;

    struct AccessPolicy {
        string policyType; // "STANDARD", "HIGH_SECURITY", "INSTITUTIONAL"
        uint256 authTimeout;
        uint256 sessionDuration;
        bool requiresGeolocation;
        bool requiresVoiceAuth;
        uint256 maxFailedAttempts;
        uint256 lockoutDuration;
        bool active;
    }

    struct AccessGrant {
        bytes32 deviceId;
        address grantee;
        uint256 startTime;
        uint256 endTime;
        string accessLevel;
        bool active;
    }

    mapping(bytes32 => AccessPolicy) public policies;
    mapping(bytes32 => bytes32) public devicePolicies;
    mapping(bytes32 => mapping(address => AccessGrant)) public accessGrants;
    mapping(address => bytes32[]) public userGrants;

    event PolicyCreated(bytes32 indexed policyId, string policyType);
    event PolicyAssigned(bytes32 indexed deviceId, bytes32 indexed policyId);
    event AccessGranted(bytes32 indexed deviceId, address indexed grantee, string accessLevel);
    event AccessRevoked(bytes32 indexed deviceId, address indexed grantee);
    event PolicyUpdated(bytes32 indexed policyId);

    constructor(address _deviceAuth) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(POLICY_ADMIN_ROLE, msg.sender);
        deviceAuth = IDeviceAuth(_deviceAuth);

        // Create default policies
        createDefaultPolicies();
    }

    /**
     * @dev Create default access policies
     */
    function createDefaultPolicies() internal {
        bytes32 standardId = keccak256(abi.encodePacked("STANDARD"));
        bytes32 highSecurityId = keccak256(abi.encodePacked("HIGH_SECURITY"));
        bytes32 institutionalId = keccak256(abi.encodePacked("INSTITUTIONAL"));

        // Standard Policy
        policies[standardId] = AccessPolicy({
            policyType: "STANDARD",
            authTimeout: 5 minutes,
            sessionDuration: 24 hours,
            requiresGeolocation: false,
            requiresVoiceAuth: false,
            maxFailedAttempts: 5,
            lockoutDuration: 1 hours,
            active: true
        });

        // High Security Policy
        policies[highSecurityId] = AccessPolicy({
            policyType: "HIGH_SECURITY",
            authTimeout: 2 minutes,
            sessionDuration: 12 hours,
            requiresGeolocation: true,
            requiresVoiceAuth: true,
            maxFailedAttempts: 3,
            lockoutDuration: 24 hours,
            active: true
        });

        // Institutional Policy
        policies[institutionalId] = AccessPolicy({
            policyType: "INSTITUTIONAL",
            authTimeout: 1 minutes,
            sessionDuration: 8 hours,
            requiresGeolocation: true,
            requiresVoiceAuth: true,
            maxFailedAttempts: 2,
            lockoutDuration: 48 hours,
            active: true
        });

        emit PolicyCreated(standardId, "STANDARD");
        emit PolicyCreated(highSecurityId, "HIGH_SECURITY");
        emit PolicyCreated(institutionalId, "INSTITUTIONAL");
    }

    /**
     * @dev Create a new access policy
     */
    function createPolicy(
        string memory policyType,
        uint256 authTimeout,
        uint256 sessionDuration,
        bool requiresGeolocation,
        bool requiresVoiceAuth,
        uint256 maxFailedAttempts,
        uint256 lockoutDuration
    ) external onlyRole(POLICY_ADMIN_ROLE) returns (bytes32) {
        require(bytes(policyType).length > 0, "Invalid policy type");
        require(authTimeout > 0, "Invalid timeout");
        require(sessionDuration > 0, "Invalid duration");
        require(maxFailedAttempts > 0, "Invalid attempts");
        require(lockoutDuration > 0, "Invalid lockout");

        bytes32 policyId = keccak256(abi.encodePacked(
            policyType,
            block.timestamp,
            msg.sender
        ));

        policies[policyId] = AccessPolicy({
            policyType: policyType,
            authTimeout: authTimeout,
            sessionDuration: sessionDuration,
            requiresGeolocation: requiresGeolocation,
            requiresVoiceAuth: requiresVoiceAuth,
            maxFailedAttempts: maxFailedAttempts,
            lockoutDuration: lockoutDuration,
            active: true
        });

        emit PolicyCreated(policyId, policyType);
        return policyId;
    }

    /**
     * @dev Assign policy to device
     */
    function assignPolicy(bytes32 deviceId, bytes32 policyId) external onlyRole(ACCESS_MANAGER_ROLE) {
        require(policies[policyId].active, "Policy not active");
        devicePolicies[deviceId] = policyId;
        emit PolicyAssigned(deviceId, policyId);
    }

    /**
     * @dev Grant access to a device
     */
    function grantAccess(
        bytes32 deviceId,
        address grantee,
        uint256 duration,
        string memory accessLevel
    ) external onlyRole(ACCESS_MANAGER_ROLE) {
        require(grantee != address(0), "Invalid grantee");
        require(duration > 0, "Invalid duration");
        require(bytes(accessLevel).length > 0, "Invalid access level");

        accessGrants[deviceId][grantee] = AccessGrant({
            deviceId: deviceId,
            grantee: grantee,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            accessLevel: accessLevel,
            active: true
        });

        userGrants[grantee].push(deviceId);
        emit AccessGranted(deviceId, grantee, accessLevel);
    }

    /**
     * @dev Revoke access to a device
     */
    function revokeAccess(bytes32 deviceId, address grantee) external onlyRole(ACCESS_MANAGER_ROLE) {
        require(accessGrants[deviceId][grantee].active, "No active grant");
        accessGrants[deviceId][grantee].active = false;
        emit AccessRevoked(deviceId, grantee);
    }

    /**
     * @dev Check if user has active access to device
     */
    function hasAccess(bytes32 deviceId, address user) external view returns (bool) {
        AccessGrant memory grant = accessGrants[deviceId][user];
        return grant.active && block.timestamp <= grant.endTime;
    }

    /**
     * @dev Get device's active policy
     */
    function getDevicePolicy(bytes32 deviceId) external view returns (
        string memory policyType,
        uint256 authTimeout,
        uint256 sessionDuration,
        bool requiresGeolocation,
        bool requiresVoiceAuth,
        uint256 maxFailedAttempts,
        uint256 lockoutDuration
    ) {
        bytes32 policyId = devicePolicies[deviceId];
        AccessPolicy memory policy = policies[policyId];
        return (
            policy.policyType,
            policy.authTimeout,
            policy.sessionDuration,
            policy.requiresGeolocation,
            policy.requiresVoiceAuth,
            policy.maxFailedAttempts,
            policy.lockoutDuration
        );
    }

    /**
     * @dev Get user's granted devices
     */
    function getUserGrants(address user) external view returns (bytes32[] memory) {
        return userGrants[user];
    }

    /**
     * @dev Update existing policy
     */
    function updatePolicy(
        bytes32 policyId,
        uint256 authTimeout,
        uint256 sessionDuration,
        bool requiresGeolocation,
        bool requiresVoiceAuth,
        uint256 maxFailedAttempts,
        uint256 lockoutDuration
    ) external onlyRole(POLICY_ADMIN_ROLE) {
        require(policies[policyId].active, "Policy not active");
        
        AccessPolicy storage policy = policies[policyId];
        policy.authTimeout = authTimeout;
        policy.sessionDuration = sessionDuration;
        policy.requiresGeolocation = requiresGeolocation;
        policy.requiresVoiceAuth = requiresVoiceAuth;
        policy.maxFailedAttempts = maxFailedAttempts;
        policy.lockoutDuration = lockoutDuration;

        emit PolicyUpdated(policyId);
    }

    /**
     * @dev Deactivate policy
     */
    function deactivatePolicy(bytes32 policyId) external onlyRole(POLICY_ADMIN_ROLE) {
        require(policies[policyId].active, "Already inactive");
        policies[policyId].active = false;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(POLICY_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(POLICY_ADMIN_ROLE) {
        _unpause();
    }
}