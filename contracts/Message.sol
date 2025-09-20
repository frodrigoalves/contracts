// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Message
 * @dev Contrato para mensagens do sistema de legado digital
 */
contract Message is ReentrancyGuard, Ownable, Pausable {
    struct MessageContent {
        address creator;      // Criador da mensagem
        address recipient;    // Destinatário
        string ipfsCID;      // Content ID no IPFS (criptografado)
        uint256 unlockTime;  // Timestamp para desbloqueio
        bool delivered;      // Status de entrega
        string trigger;      // Tipo de gatilho (data, evento social, registro civil)
        bytes32 proofHash;   // Hash da prova de evento (quando aplicável)
        bool validated;      // Validação por oráculo
    }

    // Mapeamentos principais
    mapping(uint256 => MessageContent) public messages;
    mapping(address => uint256[]) public userMessages;
    mapping(address => uint256[]) public pendingDeliveries;
    
    // Contadores e limites
    uint256 public messageCount;
    uint256 public constant MAX_UNLOCK_TIME = 100 years;
    
    // Oráculos e validadores
    mapping(address => bool) public authorizedOracles;
    mapping(string => address) public triggerOracles; // Mapeia tipo de gatilho para oráculo
    
    // Eventos
    event MessageCreated(
        uint256 indexed messageId,
        address indexed creator,
        address indexed recipient,
        uint256 unlockTime,
        string trigger
    );
    
    event MessageUnlocked(
        uint256 indexed messageId,
        address indexed recipient,
        uint256 unlockTime
    );
    
    event TriggerValidated(
        uint256 indexed messageId,
        string trigger,
        bytes32 proofHash
    );

    // Modificadores
    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }

    modifier messageExists(uint256 messageId) {
        require(messageId < messageCount, "Message does not exist");
        _;
    }

    constructor() {
        // Inicialização do contrato
    }

    /**
     * @dev Cria uma nova mensagem de legado digital
     * @param recipient Endereço do destinatário
     * @param ipfsCID Content ID do conteúdo no IPFS
     * @param unlockTime Timestamp para desbloqueio
     * @param trigger Tipo de gatilho para desbloqueio
     */
    function createMessage(
        address recipient,
        string memory ipfsCID,
        uint256 unlockTime,
        string memory trigger
    ) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(recipient != address(0), "Invalid recipient");
        require(bytes(ipfsCID).length > 0, "Invalid IPFS CID");
        require(unlockTime > block.timestamp, "Invalid unlock time");
        require(unlockTime <= block.timestamp + MAX_UNLOCK_TIME, "Unlock time too far");

        uint256 messageId = messageCount++;
        
        messages[messageId] = MessageContent({
            creator: msg.sender,
            recipient: recipient,
            ipfsCID: ipfsCID,
            unlockTime: unlockTime,
            delivered: false,
            trigger: trigger,
            proofHash: bytes32(0),
            validated: false
        });

        userMessages[msg.sender].push(messageId);
        pendingDeliveries[recipient].push(messageId);

        emit MessageCreated(
            messageId,
            msg.sender,
            recipient,
            unlockTime,
            trigger
        );
    }

    /**
     * @dev Desbloqueia uma mensagem quando as condições são atendidas
     * @param messageId ID da mensagem a ser desbloqueada
     */
    function unlockMessage(uint256 messageId) 
        external 
        whenNotPaused
        nonReentrant 
        messageExists(messageId) 
    {
        MessageContent storage message = messages[messageId];
        
        require(msg.sender == message.recipient, "Not message recipient");
        require(!message.delivered, "Message already delivered");
        require(block.timestamp >= message.unlockTime, "Message not yet unlocked");
        
        if (bytes(message.trigger).length > 0) {
            require(message.validated, "Trigger not validated");
        }

        message.delivered = true;
        
        // Remove da lista de pendentes
        _removeFromPendingDeliveries(message.recipient, messageId);

        emit MessageUnlocked(messageId, message.recipient, block.timestamp);
    }

    /**
     * @dev Valida um gatilho de evento através de um oráculo autorizado
     * @param messageId ID da mensagem
     * @param proofHash Hash da prova do evento
     */
    function validateTrigger(
        uint256 messageId,
        bytes32 proofHash
    ) 
        external 
        onlyOracle 
        messageExists(messageId) 
    {
        MessageContent storage message = messages[messageId];
        require(!message.delivered, "Message already delivered");
        require(!message.validated, "Trigger already validated");
        
        message.proofHash = proofHash;
        message.validated = true;

        emit TriggerValidated(messageId, message.trigger, proofHash);
    }

    /**
     * @dev Retorna mensagens pendentes de um usuário
     * @param user Endereço do usuário
     */
    function getPendingMessages(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return pendingDeliveries[user];
    }

    /**
     * @dev Retorna mensagens criadas por um usuário
     * @param user Endereço do usuário
     */
    function getUserMessages(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userMessages[user];
    }

    /**
     * @dev Adiciona um oráculo autorizado
     * @param oracle Endereço do oráculo
     * @param triggerType Tipo de gatilho que o oráculo valida
     */
    function addOracle(address oracle, string memory triggerType) 
        external 
        onlyOwner 
    {
        require(oracle != address(0), "Invalid oracle address");
        authorizedOracles[oracle] = true;
        triggerOracles[triggerType] = oracle;
    }

    /**
     * @dev Remove um oráculo autorizado
     * @param oracle Endereço do oráculo
     * @param triggerType Tipo de gatilho que o oráculo valida
     */
    function removeOracle(address oracle, string memory triggerType) 
        external 
        onlyOwner 
    {
        authorizedOracles[oracle] = false;
        if (triggerOracles[triggerType] == oracle) {
            delete triggerOracles[triggerType];
        }
    }

    /**
     * @dev Remove uma mensagem da lista de pendentes
     * @param user Endereço do usuário
     * @param messageId ID da mensagem
     */
    function _removeFromPendingDeliveries(address user, uint256 messageId) internal {
        uint256[] storage deliveries = pendingDeliveries[user];
        for (uint256 i = 0; i < deliveries.length; i++) {
            if (deliveries[i] == messageId) {
                deliveries[i] = deliveries[deliveries.length - 1];
                deliveries.pop();
                break;
            }
        }
    }

    /**
     * @dev Pausa o contrato
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Despausa o contrato
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}