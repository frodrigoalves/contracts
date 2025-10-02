// SPDX-License-Identifier: MIT
// SingulAI Project – Main Token
// Author: Rodrigo Alves Ferreira

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SGLToken
 * @dev Main token for SingulAI ecosystem
 */
contract SGLToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Contratos autorizados
    mapping(address => bool) public authorizedContracts;

    // Eventos
    event ContractAuthorized(address indexed contractAddress);
    event ContractRevoked(address indexed contractAddress);
    event TokensLockedForCapsule(address indexed owner, uint256 amount, uint256 unlockTime);
    event TokensUnlockedFromCapsule(address indexed owner, uint256 amount);
    event AvatarMinted(address indexed owner, uint256 avatarId);
    event TransferWithBurn(address indexed from, address indexed to, uint256 amount, uint256 burnAmount);

    uint256 public burnPercentage = 2; // 2% burn on transfer

    constructor(address admin, uint256 initialSupply) ERC20("SingulAI Token", "SGL") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _mint(admin, initialSupply);
    }    // Funções de gerenciamento
    function authorizeContract(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(contractAddress != address(0), "Endereco invalido");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }

    function revokeContract(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(authorizedContracts[contractAddress], "Contrato nao autorizado");
        authorizedContracts[contractAddress] = false;
        emit ContractRevoked(contractAddress);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Funções de integração com os contratos do MVP
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function mintAvatar(address to, uint256 avatarId, uint256 amount) external {
        require(authorizedContracts[msg.sender], "Apenas contratos autorizados");
        require(to != address(0), "Endereco invalido");
        _mint(to, amount);
        emit AvatarMinted(to, avatarId);
    }

    function lockForCapsule(address owner, uint256 amount, uint256 unlockTime) external {
        require(authorizedContracts[msg.sender], "Apenas contratos autorizados");
        require(balanceOf(owner) >= amount, "Saldo insuficiente");
        _transfer(owner, msg.sender, amount);
        emit TokensLockedForCapsule(owner, amount, unlockTime);
    }

    function unlockFromCapsule(address to, uint256 amount) external {
        require(authorizedContracts[msg.sender], "Apenas contratos autorizados");
        _transfer(msg.sender, to, amount);
        emit TokensUnlockedFromCapsule(to, amount);
    }

    // Funções base do ERC20 com pausável e burn
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        uint256 burnAmount = (amount * burnPercentage) / 100;
        uint256 transferAmount = amount - burnAmount;
        
        _transfer(_msgSender(), to, transferAmount);
        if (burnAmount > 0) {
            _burn(_msgSender(), burnAmount);
            emit TransferWithBurn(_msgSender(), to, transferAmount, burnAmount);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        uint256 burnAmount = (amount * burnPercentage) / 100;
        uint256 transferAmount = amount - burnAmount;
        
        _spendAllowance(from, _msgSender(), amount);
        _transfer(from, to, transferAmount);
        if (burnAmount > 0) {
            _burn(from, burnAmount);
            emit TransferWithBurn(from, to, transferAmount, burnAmount);
        }
        return true;
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }
}