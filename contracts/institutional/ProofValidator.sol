// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IProofValidator.sol";

/**
 * @title ProofValidator
 * @dev Validates digital proofs from institutional partners
 */
contract ProofValidator is IProofValidator, AccessControl, Pausable {
    using ECDSA for bytes32;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct ProofType {
        string name;
        uint256 validityPeriod;
        bool active;
        bool requiresMultiSig;
        uint256 requiredSignatures;
    }

    mapping(bytes32 => ProofType) public proofTypes;
    mapping(bytes32 => mapping(address => bool)) public proofSignatures;
    mapping(bytes32 => uint256) public signatureCount;

    event ProofTypeRegistered(bytes32 indexed typeHash, string name, uint256 validityPeriod);
    event ProofValidated(bytes32 indexed proofHash, address indexed validator);
    event MultiSigProofCompleted(bytes32 indexed proofHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new type of proof with its requirements
     */
    function registerProofType(
        string memory name,
        uint256 validityPeriod,
        bool requiresMultiSig,
        uint256 requiredSignatures
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(name).length > 0, "Invalid name");
        require(validityPeriod > 0, "Invalid validity period");
        if (requiresMultiSig) {
            require(requiredSignatures > 1, "Invalid signature requirement");
        }

        bytes32 typeHash = keccak256(abi.encodePacked(name));
        proofTypes[typeHash] = ProofType({
            name: name,
            validityPeriod: validityPeriod,
            active: true,
            requiresMultiSig: requiresMultiSig,
            requiredSignatures: requiredSignatures
        });

        emit ProofTypeRegistered(typeHash, name, validityPeriod);
    }

    /**
     * @dev Validate a proof from an institution
     */
    function validateProof(
        bytes32 proofHash,
        string calldata proofData,
        bytes calldata signature,
        address institution
    ) external override onlyRole(VALIDATOR_ROLE) whenNotPaused returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(proofHash, proofData));
        address signer = ECDSA.recover(messageHash, signature);
        
        require(signer == institution, "Invalid signature");

        if (!proofSignatures[proofHash][institution]) {
            proofSignatures[proofHash][institution] = true;
            signatureCount[proofHash]++;
            emit ProofValidated(proofHash, institution);
        }

        return true;
    }

    /**
     * @dev Check if a proof has all required signatures
     */
    function isProofComplete(bytes32 proofHash, bytes32 typeHash) external view returns (bool) {
        ProofType memory pType = proofTypes[typeHash];
        if (!pType.requiresMultiSig) {
            return signatureCount[proofHash] > 0;
        }
        return signatureCount[proofHash] >= pType.requiredSignatures;
    }

    /**
     * @dev Get proof type details
     */
    function getProofType(bytes32 typeHash) external view returns (
        string memory name,
        uint256 validityPeriod,
        bool active,
        bool requiresMultiSig,
        uint256 requiredSignatures
    ) {
        ProofType memory pt = proofTypes[typeHash];
        return (
            pt.name,
            pt.validityPeriod,
            pt.active,
            pt.requiresMultiSig,
            pt.requiredSignatures
        );
    }

    /**
     * @dev Deactivate a proof type
     */
    function deactivateProofType(bytes32 typeHash) external onlyRole(ADMIN_ROLE) {
        require(proofTypes[typeHash].active, "Already inactive");
        proofTypes[typeHash].active = false;
    }

    /**
     * @dev Reactivate a proof type
     */
    function reactivateProofType(bytes32 typeHash) external onlyRole(ADMIN_ROLE) {
        require(!proofTypes[typeHash].active, "Already active");
        proofTypes[typeHash].active = true;
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