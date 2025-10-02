// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AvatarBase.sol";

/**
 * @title AvatarPro
 * @dev Manages premium services and monetization for avatars
 */
contract AvatarPro is ReentrancyGuard, Ownable {
    // State variables
    AvatarBase public avatarBase;
    IERC20 public sglToken;
    
    struct ServiceConfig {
        uint256 basePrice;        // Base price in SGL tokens
        uint256 duration;         // Service duration in seconds
        bool isActive;            // Service availability
        uint256 maxSessions;      // Max concurrent sessions
        uint256 activeSessions;   // Current active sessions
    }
    
    struct Session {
        address client;           // Client address
        uint256 startTime;        // Session start timestamp
        uint256 endTime;         // Session end timestamp
        uint256 tokensLocked;    // SGL tokens locked for session
        bool isActive;           // Session status
    }
    
    // Mappings
    mapping(uint256 => ServiceConfig) public avatarServices;
    mapping(uint256 => Session[]) public avatarSessions;
    mapping(uint256 => uint256) public avatarRevenue;
    
    // Events
    event ServiceConfigured(
        uint256 indexed avatarId,
        uint256 basePrice,
        uint256 duration,
        uint256 maxSessions
    );
    
    event SessionStarted(
        uint256 indexed avatarId,
        address indexed client,
        uint256 sessionId,
        uint256 tokensLocked
    );
    
    event SessionEnded(
        uint256 indexed avatarId,
        address indexed client,
        uint256 sessionId,
        uint256 tokensReleased
    );
    
    event RevenueWithdrawn(
        uint256 indexed avatarId,
        address indexed beneficiary,
        uint256 amount
    );

    constructor(address _avatarBase, address _sglToken) Ownable(msg.sender) {
        require(_avatarBase != address(0), "Invalid AvatarBase address");
        require(_sglToken != address(0), "Invalid SGL token address");
        avatarBase = AvatarBase(_avatarBase);
        sglToken = IERC20(_sglToken);
    }

    /**
     * @dev Configures premium service settings for an avatar
     */
    function configureService(
        uint256 _avatarId,
        uint256 _basePrice,
        uint256 _duration,
        uint256 _maxSessions
    ) 
        external 
    {
        (, , , , address avatarOwner, , ) = avatarBase.avatars(_avatarId);
        require(
            msg.sender == avatarOwner,
            "Not avatar creator"
        );
        require(_duration > 0, "Invalid duration");
        require(_maxSessions > 0, "Invalid max sessions");

        ServiceConfig storage config = avatarServices[_avatarId];
        config.basePrice = _basePrice;
        config.duration = _duration;
        config.maxSessions = _maxSessions;
        config.isActive = true;

        emit ServiceConfigured(_avatarId, _basePrice, _duration, _maxSessions);
    }

    /**
     * @dev Starts a premium service session
     */
    function startSession(uint256 _avatarId) external nonReentrant {
        ServiceConfig storage config = avatarServices[_avatarId];
        require(config.isActive, "Service not active");
        require(
            config.activeSessions < config.maxSessions,
            "Maximum sessions reached"
        );

        uint256 payment = config.basePrice;
        require(
            sglToken.transferFrom(msg.sender, address(this), payment),
            "Token transfer failed"
        );

        uint256 sessionId = avatarSessions[_avatarId].length;
        avatarSessions[_avatarId].push(Session({
            client: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + config.duration,
            tokensLocked: payment,
            isActive: true
        }));

        config.activeSessions++;
        avatarRevenue[_avatarId] += payment;

        emit SessionStarted(_avatarId, msg.sender, sessionId, payment);
    }

    /**
     * @dev Ends a premium service session
     */
    function endSession(uint256 _avatarId, uint256 _sessionId) external nonReentrant {
        Session storage session = avatarSessions[_avatarId][_sessionId];
        (, , , , address avatarOwner, , ) = avatarBase.avatars(_avatarId);
        require(session.isActive, "Session not active");
        require(
            msg.sender == session.client || 
            msg.sender == avatarOwner,
            "Not authorized"
        );

        session.isActive = false;
        avatarServices[_avatarId].activeSessions--;

        emit SessionEnded(
            _avatarId,
            session.client,
            _sessionId,
            session.tokensLocked
        );
    }

    /**
     * @dev Withdraws accumulated revenue
     */
    function withdrawRevenue(uint256 _avatarId) external nonReentrant {
        (, , , , address avatarOwner, , ) = avatarBase.avatars(_avatarId);
        require(
            msg.sender == avatarOwner,
            "Not avatar creator"
        );

        uint256 amount = avatarRevenue[_avatarId];
        require(amount > 0, "No revenue to withdraw");

        avatarRevenue[_avatarId] = 0;
        require(
            sglToken.transfer(msg.sender, amount),
            "Token transfer failed"
        );

        emit RevenueWithdrawn(_avatarId, msg.sender, amount);
    }

    /**
     * @dev Gets active session count for an avatar
     */
    function getActiveSessionCount(uint256 _avatarId) 
        external 
        view 
        returns (uint256) 
    {
        return avatarServices[_avatarId].activeSessions;
    }

    /**
     * @dev Gets all sessions for an avatar
     */
    function getAvatarSessions(uint256 _avatarId)
        external
        view
        returns (Session[] memory)
    {
        return avatarSessions[_avatarId];
    }

    /**
     * @dev Checks if a service is available
     */
    function isServiceAvailable(uint256 _avatarId)
        external
        view
        returns (bool)
    {
        ServiceConfig storage config = avatarServices[_avatarId];
        return config.isActive && config.activeSessions < config.maxSessions;
    }

    /**
     * @dev Emergency pause for a service
     */
    function toggleService(uint256 _avatarId) external {
        (, , , , address avatarOwner, , ) = avatarBase.avatars(_avatarId);
        require(
            msg.sender == avatarOwner,
            "Not avatar creator"
        );
        avatarServices[_avatarId].isActive = !avatarServices[_avatarId].isActive;
    }

    /**
     * @dev Emergency token withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = sglToken.balanceOf(address(this));
        require(sglToken.transfer(owner(), balance), "Transfer failed");
    }
}