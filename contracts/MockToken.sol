// SPDX-License-Identifier: MIT
// SingulAI Project – MVP Test Token
// Author: Rodrigo Alves Ferreira

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MockToken
 * @dev Token de teste para o MVP da SingulAI
 */
contract MockToken is ERC20, Ownable, Pausable {
    // Contratos autorizados
    mapping(address => bool) public authorizedContracts;
    
    // Eventos
    event ContractAuthorized(address indexed contractAddress);
    event ContractRevoked(address indexed contractAddress);
    event TokensLockedForCapsule(address indexed owner, uint256 amount, uint256 unlockTime);
    event TokensUnlockedFromCapsule(address indexed owner, uint256 amount);
    event AvatarMinted(address indexed owner, uint256 avatarId);

    constructor(uint256 initialSupply) ERC20("SingulAI Test Token", "tSGL") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Funções de gerenciamento
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Endereco invalido");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }

    function revokeContract(address contractAddress) external onlyOwner {
        require(authorizedContracts[contractAddress], "Contrato nao autorizado");
        authorizedContracts[contractAddress] = false;
        emit ContractRevoked(contractAddress);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Funções de integração com os contratos do MVP
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

    // Funções base do ERC20 com pausável
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }
}