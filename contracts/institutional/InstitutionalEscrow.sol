// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IOracleRegistry.sol";

/**
 * @title InstitutionalEscrow
 * @dev Manages institutional assets with time-locks and oracle triggers
 */
contract InstitutionalEscrow is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ESCROW_MANAGER_ROLE = keccak256("ESCROW_MANAGER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IOracleRegistry public oracleRegistry;

    struct EscrowLock {
        address token;
        uint256 amount;
        address beneficiary;
        uint256 unlockTime;
        bytes32 triggerEvent;
        bool released;
        string escrowType; // "INHERITANCE", "INSURANCE", "LEGAL"
        address institution;
    }

    mapping(bytes32 => EscrowLock) public escrows;
    mapping(address => bytes32[]) public institutionEscrows;
    mapping(address => bytes32[]) public beneficiaryEscrows;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed institution,
        address indexed beneficiary,
        uint256 amount
    );
    event EscrowReleased(bytes32 indexed escrowId, address indexed beneficiary, uint256 amount);
    event EscrowCancelled(bytes32 indexed escrowId);

    constructor(address _oracleRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        oracleRegistry = IOracleRegistry(_oracleRegistry);
    }

    /**
     * @dev Create a new institutional escrow
     */
    function createEscrow(
        address token,
        uint256 amount,
        address beneficiary,
        uint256 unlockTime,
        bytes32 triggerEvent,
        string memory escrowType
    ) external onlyRole(ESCROW_MANAGER_ROLE) whenNotPaused nonReentrant returns (bytes32) {
        require(token != address(0), "Invalid token");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Invalid amount");
        require(bytes(escrowType).length > 0, "Invalid escrow type");

        bytes32 escrowId = keccak256(abi.encodePacked(
            token,
            beneficiary,
            amount,
            unlockTime,
            triggerEvent,
            block.timestamp
        ));

        require(escrows[escrowId].amount == 0, "Escrow exists");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        escrows[escrowId] = EscrowLock({
            token: token,
            amount: amount,
            beneficiary: beneficiary,
            unlockTime: unlockTime,
            triggerEvent: triggerEvent,
            released: false,
            escrowType: escrowType,
            institution: msg.sender
        });

        institutionEscrows[msg.sender].push(escrowId);
        beneficiaryEscrows[beneficiary].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, beneficiary, amount);
        return escrowId;
    }

    /**
     * @dev Release funds from escrow when conditions are met
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant {
        EscrowLock storage escrow = escrows[escrowId];
        require(!escrow.released, "Already released");
        require(block.timestamp >= escrow.unlockTime, "Time lock active");
        
        if (escrow.triggerEvent != bytes32(0)) {
            require(
                oracleRegistry.isEventValid(escrow.triggerEvent),
                "Trigger event not validated"
            );
        }

        escrow.released = true;
        IERC20(escrow.token).transfer(escrow.beneficiary, escrow.amount);

        emit EscrowReleased(escrowId, escrow.beneficiary, escrow.amount);
    }

    /**
     * @dev Emergency cancel escrow (requires multiple approvals)
     */
    function cancelEscrow(bytes32 escrowId) external onlyRole(ADMIN_ROLE) {
        EscrowLock storage escrow = escrows[escrowId];
        require(!escrow.released, "Already released");

        escrow.released = true;
        IERC20(escrow.token).transfer(escrow.institution, escrow.amount);

        emit EscrowCancelled(escrowId);
    }

    /**
     * @dev Get escrow details
     */
    function getEscrowDetails(bytes32 escrowId) external view returns (
        address token,
        uint256 amount,
        address beneficiary,
        uint256 unlockTime,
        bytes32 triggerEvent,
        bool released,
        string memory escrowType,
        address institution
    ) {
        EscrowLock memory e = escrows[escrowId];
        return (
            e.token,
            e.amount,
            e.beneficiary,
            e.unlockTime,
            e.triggerEvent,
            e.released,
            e.escrowType,
            e.institution
        );
    }

    /**
     * @dev Get institution's escrows
     */
    function getInstitutionEscrows(address institution) external view returns (bytes32[] memory) {
        return institutionEscrows[institution];
    }

    /**
     * @dev Get beneficiary's escrows
     */
    function getBeneficiaryEscrows(address beneficiary) external view returns (bytes32[] memory) {
        return beneficiaryEscrows[beneficiary];
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