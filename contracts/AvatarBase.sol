// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AvatarBase
 * @dev Base contract for SingulAI digital avatars
 */
contract AvatarBase is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _avatarIds;

    struct Avatar {
        string code;        // A=Laura, B=Letícia, C=Pedro
        string name;
        string temperament;
        string personality;
        address owner;
        bool active;
        uint256 createdAt;
    }

    mapping(uint256 => Avatar) public avatars;
    mapping(address => uint256[]) public userAvatars;

    event AvatarCreated(uint256 indexed avatarId, address indexed owner, string code);
    event AvatarActivated(uint256 indexed avatarId);
    event AvatarDeactivated(uint256 indexed avatarId);

    constructor() Ownable(msg.sender) {}

    function createAvatar(
        address owner,
        string memory code,
        string memory name,
        string memory temperament,
        string memory personality
    ) external onlyOwner returns (uint256) {
        require(bytes(code).length > 0, "Invalid avatar code");
        require(owner != address(0), "Invalid owner address");

        _avatarIds.increment();
        uint256 newAvatarId = _avatarIds.current();

        avatars[newAvatarId] = Avatar({
            code: code,
            name: name,
            temperament: temperament,
            personality: personality,
            owner: owner,
            active: true,
            createdAt: block.timestamp
        });

        userAvatars[owner].push(newAvatarId);

        emit AvatarCreated(newAvatarId, owner, code);
        return newAvatarId;
    }

    function activateAvatar(uint256 avatarId) external {
        require(avatars[avatarId].owner == msg.sender, "Not avatar owner");
        require(!avatars[avatarId].active, "Avatar already active");
        
        avatars[avatarId].active = true;
        emit AvatarActivated(avatarId);
    }

    function deactivateAvatar(uint256 avatarId) external {
        require(avatars[avatarId].owner == msg.sender, "Not avatar owner");
        require(avatars[avatarId].active, "Avatar already inactive");
        
        avatars[avatarId].active = false;
        emit AvatarDeactivated(avatarId);
    }

    function getAvatar(uint256 avatarId) external view returns (
        string memory code,
        string memory name,
        string memory temperament,
        string memory personality,
        address owner,
        bool active,
        uint256 createdAt
    ) {
        Avatar memory avatar = avatars[avatarId];
        return (
            avatar.code,
            avatar.name,
            avatar.temperament,
            avatar.personality,
            avatar.owner,
            avatar.active,
            avatar.createdAt
        );
    }

    function getUserAvatars(address user) external view returns (uint256[] memory) {
        return userAvatars[user];
    }
}