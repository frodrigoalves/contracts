// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IProofValidator.sol";
import "./interfaces/IOracleRegistry.sol";

/**
 * @title InstitutionalGateway
 * @dev Main entry point for institutional integrations with role-based access
 * and security controls
 */
contract InstitutionalGateway is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IProofValidator public proofValidator;
    IOracleRegistry public oracleRegistry;

    struct Institution {
        string name;
        string institutionType; // "BANK", "NOTARY", "INSURANCE", "LAW_FIRM"
        bool active;
        uint256 integrationDate;
        bytes32 serviceLevel; // Hash of SLA terms
    }

    mapping(address => Institution) public institutions;
    mapping(bytes32 => bool) public verifiedProofs;
    
    event InstitutionRegistered(address indexed institution, string name, string institutionType);
    event ProofSubmitted(address indexed institution, bytes32 indexed proofHash);
    event ProofValidated(bytes32 indexed proofHash, bool valid);

    constructor(address _proofValidator, address _oracleRegistry) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        proofValidator = IProofValidator(_proofValidator);
        oracleRegistry = IOracleRegistry(_oracleRegistry);
    }

    /**
     * @dev Register a new institution with KYC and compliance checks
     */
    function registerInstitution(
        address institutionAddress,
        string memory name,
        string memory institutionType,
        bytes32 serviceLevelHash
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(institutionType).length > 0, "Invalid type");
        require(institutions[institutionAddress].integrationDate == 0, "Already registered");

        institutions[institutionAddress] = Institution({
            name: name,
            institutionType: institutionType,
            active: true,
            integrationDate: block.timestamp,
            serviceLevel: serviceLevelHash
        });

        _grantRole(INSTITUTION_ROLE, institutionAddress);
        
        emit InstitutionRegistered(institutionAddress, name, institutionType);
    }

    /**
     * @dev Submit institutional proof for validation
     * @param proofHash Hash of the proof document
     * @param proofData IPFS CID or other reference to proof data
     * @param signature Digital signature of the institution
     */
    function submitProof(
        bytes32 proofHash,
        string calldata proofData,
        bytes calldata signature
    ) external onlyRole(INSTITUTION_ROLE) whenNotPaused nonReentrant {
        require(!verifiedProofs[proofHash], "Proof already verified");
        require(institutions[msg.sender].active, "Institution not active");

        bool isValid = proofValidator.validateProof(
            proofHash,
            proofData,
            signature,
            msg.sender
        );

        require(isValid, "Invalid proof");
        verifiedProofs[proofHash] = true;

        emit ProofSubmitted(msg.sender, proofHash);
        emit ProofValidated(proofHash, true);
    }

    /**
     * @dev Verify if a proof has been validated
     */
    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }

    /**
     * @dev Suspend an institution
     */
    function suspendInstitution(address institution) external onlyRole(ADMIN_ROLE) {
        require(institutions[institution].active, "Institution already suspended");
        institutions[institution].active = false;
    }

    /**
     * @dev Reactivate a suspended institution
     */
    function reactivateInstitution(address institution) external onlyRole(ADMIN_ROLE) {
        require(!institutions[institution].active, "Institution already active");
        institutions[institution].active = true;
    }

    /**
     * @dev Emergency pause for all institutional operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume institutional operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}