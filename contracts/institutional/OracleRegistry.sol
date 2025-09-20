// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IOracleRegistry.sol";

/**
 * @title OracleRegistry
 * @dev Manages trusted institutional oracles for validating real-world events
 */
contract OracleRegistry is IOracleRegistry, AccessControl, Pausable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Oracle {
        string name;
        string oracleType; // "NOTARY", "BANK", "GOVERNMENT", "INSURANCE"
        bool active;
        uint256 registrationDate;
        uint256 validationCount;
    }

    mapping(address => Oracle) public oracles;
    mapping(bytes32 => mapping(address => bool)) public validations;
    mapping(bytes32 => uint256) public validationCounts;
    uint256 public minValidations = 1;

    event OracleRegistered(address indexed oracle, string name, string oracleType);
    event EventValidated(bytes32 indexed eventHash, address indexed oracle);
    event MinValidationsUpdated(uint256 newValue);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new institutional oracle
     */
    function registerOracle(
        address oracleAddress,
        string memory name,
        string memory oracleType
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(oracleType).length > 0, "Invalid type");
        require(oracles[oracleAddress].registrationDate == 0, "Already registered");

        oracles[oracleAddress] = Oracle({
            name: name,
            oracleType: oracleType,
            active: true,
            registrationDate: block.timestamp,
            validationCount: 0
        });

        _grantRole(ORACLE_ROLE, oracleAddress);
        
        emit OracleRegistered(oracleAddress, name, oracleType);
    }

    /**
     * @dev Validate an event (e.g., death certificate, court order)
     */
    function validateEvent(bytes32 eventHash) external override onlyRole(ORACLE_ROLE) whenNotPaused {
        require(oracles[msg.sender].active, "Oracle not active");
        require(!validations[eventHash][msg.sender], "Already validated");

        validations[eventHash][msg.sender] = true;
        validationCounts[eventHash]++;
        oracles[msg.sender].validationCount++;

        emit EventValidated(eventHash, msg.sender);
    }

    /**
     * @dev Check if an event has reached the required number of validations
     */
    function isEventValid(bytes32 eventHash) external view override returns (bool) {
        return validationCounts[eventHash] >= minValidations;
    }

    /**
     * @dev Update minimum required validations
     */
    function setMinValidations(uint256 _minValidations) external onlyRole(ADMIN_ROLE) {
        require(_minValidations > 0, "Invalid min validations");
        minValidations = _minValidations;
        emit MinValidationsUpdated(_minValidations);
    }

    /**
     * @dev Deactivate an oracle
     */
    function deactivateOracle(address oracle) external onlyRole(ADMIN_ROLE) {
        require(oracles[oracle].active, "Oracle already inactive");
        oracles[oracle].active = false;
    }

    /**
     * @dev Reactivate an oracle
     */
    function reactivateOracle(address oracle) external onlyRole(ADMIN_ROLE) {
        require(!oracles[oracle].active, "Oracle already active");
        oracles[oracle].active = true;
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

    /**
     * @dev Get oracle details
     */
    function getOracleInfo(address oracle) external view returns (
        string memory name,
        string memory oracleType,
        bool active,
        uint256 registrationDate,
        uint256 validationCount
    ) {
        Oracle memory o = oracles[oracle];
        return (o.name, o.oracleType, o.active, o.registrationDate, o.validationCount);
    }
}