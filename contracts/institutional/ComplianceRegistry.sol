// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ComplianceRegistry
 * @dev Records and manages compliance logs and audit trails
 */
contract ComplianceRegistry is AccessControl, Pausable {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct ComplianceLog {
        string action;
        string category; // "KYC", "AML", "LEGAL", "OPERATIONAL"
        address institution;
        uint256 timestamp;
        bytes32 dataHash;
        string metadata;
        bool verified;
    }

    struct CompliancePolicy {
        string name;
        string policyType;
        bytes32 documentHash;
        uint256 effectiveDate;
        bool active;
    }

    mapping(bytes32 => ComplianceLog) public complianceLogs;
    mapping(bytes32 => CompliancePolicy) public policies;
    mapping(address => bytes32[]) public institutionLogs;
    mapping(string => bytes32[]) public categoryLogs;

    event ComplianceLogAdded(
        bytes32 indexed logId,
        string action,
        address indexed institution,
        string category
    );
    event PolicyRegistered(bytes32 indexed policyId, string name, string policyType);
    event LogVerified(bytes32 indexed logId, address indexed verifier);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Add a compliance log entry
     */
    function addComplianceLog(
        string memory action,
        string memory category,
        bytes32 dataHash,
        string memory metadata
    ) external onlyRole(COMPLIANCE_ROLE) whenNotPaused returns (bytes32) {
        require(bytes(action).length > 0, "Invalid action");
        require(bytes(category).length > 0, "Invalid category");

        bytes32 logId = keccak256(abi.encodePacked(
            action,
            msg.sender,
            dataHash,
            block.timestamp
        ));

        complianceLogs[logId] = ComplianceLog({
            action: action,
            category: category,
            institution: msg.sender,
            timestamp: block.timestamp,
            dataHash: dataHash,
            metadata: metadata,
            verified: false
        });

        institutionLogs[msg.sender].push(logId);
        categoryLogs[category].push(logId);

        emit ComplianceLogAdded(logId, action, msg.sender, category);
        return logId;
    }

    /**
     * @dev Register a new compliance policy
     */
    function registerPolicy(
        string memory name,
        string memory policyType,
        bytes32 documentHash,
        uint256 effectiveDate
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(policyType).length > 0, "Invalid type");
        require(effectiveDate >= block.timestamp, "Invalid date");

        bytes32 policyId = keccak256(abi.encodePacked(name, policyType, documentHash));
        
        policies[policyId] = CompliancePolicy({
            name: name,
            policyType: policyType,
            documentHash: documentHash,
            effectiveDate: effectiveDate,
            active: true
        });

        emit PolicyRegistered(policyId, name, policyType);
    }

    /**
     * @dev Verify a compliance log
     */
    function verifyLog(bytes32 logId) external onlyRole(COMPLIANCE_ROLE) {
        require(!complianceLogs[logId].verified, "Already verified");
        complianceLogs[logId].verified = true;
        emit LogVerified(logId, msg.sender);
    }

    /**
     * @dev Get compliance log details
     */
    function getComplianceLog(bytes32 logId) external view returns (
        string memory action,
        string memory category,
        address institution,
        uint256 timestamp,
        bytes32 dataHash,
        string memory metadata,
        bool verified
    ) {
        ComplianceLog memory log = complianceLogs[logId];
        return (
            log.action,
            log.category,
            log.institution,
            log.timestamp,
            log.dataHash,
            log.metadata,
            log.verified
        );
    }

    /**
     * @dev Get policy details
     */
    function getPolicy(bytes32 policyId) external view returns (
        string memory name,
        string memory policyType,
        bytes32 documentHash,
        uint256 effectiveDate,
        bool active
    ) {
        CompliancePolicy memory policy = policies[policyId];
        return (
            policy.name,
            policy.policyType,
            policy.documentHash,
            policy.effectiveDate,
            policy.active
        );
    }

    /**
     * @dev Get institution's compliance logs
     */
    function getInstitutionLogs(address institution) external view returns (bytes32[] memory) {
        return institutionLogs[institution];
    }

    /**
     * @dev Get logs by category
     */
    function getCategoryLogs(string memory category) external view returns (bytes32[] memory) {
        return categoryLogs[category];
    }

    /**
     * @dev Deactivate a policy
     */
    function deactivatePolicy(bytes32 policyId) external onlyRole(ADMIN_ROLE) {
        require(policies[policyId].active, "Already inactive");
        policies[policyId].active = false;
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