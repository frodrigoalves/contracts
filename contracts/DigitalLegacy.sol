// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AvatarBase.sol";

/**
 * @title DigitalLegacy
 * @dev Manages professional legacy profiles for SingulAI avatars (AvatarPro)
 */
contract DigitalLegacy is Ownable {
    AvatarBase public avatarBase;

    enum Seniority { JUNIOR, PLENO, SENIOR, PRINCIPAL }

    struct Profile {
        uint256 avatarId;
        string domain;         // ex: "advocacia", "dev", "arte"
        Seniority seniority;
        string[] skills;
        string[] achievements;
        bool approved;
        uint256 updatedAt;
    }

    mapping(uint256 => Profile) public profiles;
    mapping(string => uint256[]) public domainProfiles;

    event ProfileCreated(uint256 indexed avatarId, string domain, Seniority seniority);
    event ProfileUpdated(uint256 indexed avatarId, string domain, Seniority seniority);
    event ProfileApproved(uint256 indexed avatarId);

    constructor(address _avatarBase) Ownable(msg.sender) {
        require(_avatarBase != address(0), "Invalid AvatarBase address");
        avatarBase = AvatarBase(_avatarBase);
    }

    function createOrUpdateProfile(
        uint256 avatarId,
        string memory domain,
        Seniority seniority,
        string[] memory skills,
        string[] memory achievements
    ) external {
        require(bytes(domain).length > 0, "Invalid domain");
        
        (, , , , address owner, bool active, ) = avatarBase.getAvatar(avatarId);
        require(owner == msg.sender, "Not avatar owner");
        require(active, "Avatar not active");

        bool isNew = profiles[avatarId].avatarId == 0;

        if (isNew) {
            profiles[avatarId] = Profile({
                avatarId: avatarId,
                domain: domain,
                seniority: seniority,
                skills: skills,
                achievements: achievements,
                approved: false,
                updatedAt: block.timestamp
            });

            domainProfiles[domain].push(avatarId);
            emit ProfileCreated(avatarId, domain, seniority);
        } else {
            Profile storage profile = profiles[avatarId];
            
            // Remove from old domain index if domain changed
            if (keccak256(bytes(profile.domain)) != keccak256(bytes(domain))) {
                removeFromDomain(avatarId, profile.domain);
                domainProfiles[domain].push(avatarId);
            }

            profile.domain = domain;
            profile.seniority = seniority;
            profile.skills = skills;
            profile.achievements = achievements;
            profile.approved = false;
            profile.updatedAt = block.timestamp;

            emit ProfileUpdated(avatarId, domain, seniority);
        }
    }

    function approveProfile(uint256 avatarId) external onlyOwner {
        require(profiles[avatarId].avatarId != 0, "Profile does not exist");
        require(!profiles[avatarId].approved, "Profile already approved");

        profiles[avatarId].approved = true;
        emit ProfileApproved(avatarId);
    }

    function getProfile(uint256 avatarId) external view returns (
        string memory domain,
        Seniority seniority,
        string[] memory skills,
        string[] memory achievements,
        bool approved,
        uint256 updatedAt
    ) {
        Profile memory profile = profiles[avatarId];
        require(profile.avatarId != 0, "Profile does not exist");
        
        return (
            profile.domain,
            profile.seniority,
            profile.skills,
            profile.achievements,
            profile.approved,
            profile.updatedAt
        );
    }

    function getDomainProfiles(string memory domain) external view returns (uint256[] memory) {
        return domainProfiles[domain];
    }

    function removeFromDomain(uint256 avatarId, string memory domain) internal {
        uint256[] storage avatars = domainProfiles[domain];
        for (uint i = 0; i < avatars.length; i++) {
            if (avatars[i] == avatarId) {
                avatars[i] = avatars[avatars.length - 1];
                avatars.pop();
                break;
            }
        }
    }
}