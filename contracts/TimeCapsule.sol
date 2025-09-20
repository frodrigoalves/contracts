// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./AvatarBase.sol";

/**
 * @title TimeCapsule
 * @dev Manages time-locked capsules for SingulAI avatars
 */
contract TimeCapsule is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _capsuleIds;

    AvatarBase public avatarBase;

    struct Capsule {
        uint256 avatarId;
        string contentCid;      // IPFS CID of encrypted content
        address primaryRecipient;
        address fallbackRecipient;
        bool isPublic;
        uint256 unlockTime;
        bool unlocked;
        uint256 createdAt;
    }

    mapping(uint256 => Capsule) public capsules;
    mapping(uint256 => uint256[]) public avatarCapsules;

    event CapsuleCreated(
        uint256 indexed capsuleId,
        uint256 indexed avatarId,
        string contentCid,
        uint256 unlockTime
    );
    event CapsuleUnlocked(uint256 indexed capsuleId, address unlockedBy);

    constructor(address _avatarBase) Ownable(msg.sender) {
        require(_avatarBase != address(0), "Invalid AvatarBase address");
        avatarBase = AvatarBase(_avatarBase);
    }

    function createCapsule(
        uint256 avatarId,
        string memory contentCid,
        address primaryRecipient,
        address fallbackRecipient,
        bool isPublic,
        uint256 unlockTime
    ) external returns (uint256) {
        require(bytes(contentCid).length > 0, "Invalid content CID");
        require(unlockTime > block.timestamp, "Invalid unlock time");
        require(primaryRecipient != address(0), "Invalid primary recipient");

        (, , , , address owner, bool active, ) = avatarBase.getAvatar(avatarId);
        require(owner == msg.sender, "Not avatar owner");
        require(active, "Avatar not active");

        _capsuleIds.increment();
        uint256 capsuleId = _capsuleIds.current();

        capsules[capsuleId] = Capsule({
            avatarId: avatarId,
            contentCid: contentCid,
            primaryRecipient: primaryRecipient,
            fallbackRecipient: fallbackRecipient,
            isPublic: isPublic,
            unlockTime: unlockTime,
            unlocked: false,
            createdAt: block.timestamp
        });

        avatarCapsules[avatarId].push(capsuleId);

        emit CapsuleCreated(capsuleId, avatarId, contentCid, unlockTime);
        return capsuleId;
    }

    function unlockCapsule(uint256 capsuleId) external {
        Capsule storage capsule = capsules[capsuleId];
        require(!capsule.unlocked, "Capsule already unlocked");
        require(block.timestamp >= capsule.unlockTime, "Capsule still locked");
        require(
            msg.sender == capsule.primaryRecipient ||
            msg.sender == capsule.fallbackRecipient ||
            (capsule.isPublic && capsule.unlockTime <= block.timestamp),
            "Not authorized to unlock"
        );

        capsule.unlocked = true;
        emit CapsuleUnlocked(capsuleId, msg.sender);
    }

    function getAvatarCapsules(uint256 avatarId) external view returns (uint256[] memory) {
        return avatarCapsules[avatarId];
    }

    function getCapsule(uint256 capsuleId) external view returns (
        uint256 avatarId,
        string memory contentCid,
        address primaryRecipient,
        address fallbackRecipient,
        bool isPublic,
        uint256 unlockTime,
        bool unlocked,
        uint256 createdAt
    ) {
        Capsule memory capsule = capsules[capsuleId];
        return (
            capsule.avatarId,
            capsule.contentCid,
            capsule.primaryRecipient,
            capsule.fallbackRecipient,
            capsule.isPublic,
            capsule.unlockTime,
            capsule.unlocked,
            capsule.createdAt
        );
    }
}