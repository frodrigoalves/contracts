// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AvatarBase.sol";

/**
 * @title AvatarWalletLink
 * @dev Manages wallet linking and verification for SingulAI avatars
 */
contract AvatarWalletLink is Ownable {
    AvatarBase public avatarBase;

    struct WalletLink {
        uint256 avatarId;
        address wallet;
        bool verified;
        uint256 verifiedAt;
    }

    mapping(uint256 => WalletLink[]) public avatarWallets;
    mapping(address => bool) public verifiedWallets;

    event WalletLinked(uint256 indexed avatarId, address indexed wallet);
    event WalletVerified(uint256 indexed avatarId, address indexed wallet);
    event WalletUnlinked(uint256 indexed avatarId, address indexed wallet);

    constructor(address _avatarBase) Ownable(msg.sender) {
        require(_avatarBase != address(0), "Invalid AvatarBase address");
        avatarBase = AvatarBase(_avatarBase);
    }

    function linkWallet(uint256 avatarId, address wallet) external {
        (, , , , address owner, bool active, ) = avatarBase.getAvatar(avatarId);
        require(owner == msg.sender, "Not avatar owner");
        require(active, "Avatar not active");
        require(wallet != address(0), "Invalid wallet address");
        require(!verifiedWallets[wallet], "Wallet already verified");

        avatarWallets[avatarId].push(WalletLink({
            avatarId: avatarId,
            wallet: wallet,
            verified: false,
            verifiedAt: 0
        }));

        emit WalletLinked(avatarId, wallet);
    }

    function verifyWallet(uint256 avatarId, address wallet) external {
        require(msg.sender == wallet, "Must be called by wallet owner");
        
        WalletLink[] storage links = avatarWallets[avatarId];
        for (uint i = 0; i < links.length; i++) {
            if (links[i].wallet == wallet && !links[i].verified) {
                links[i].verified = true;
                links[i].verifiedAt = block.timestamp;
                verifiedWallets[wallet] = true;
                emit WalletVerified(avatarId, wallet);
                return;
            }
        }
        revert("Wallet link not found or already verified");
    }

    function unlinkWallet(uint256 avatarId, address wallet) external {
        (, , , , address owner, , ) = avatarBase.getAvatar(avatarId);
        require(owner == msg.sender, "Not avatar owner");

        WalletLink[] storage links = avatarWallets[avatarId];
        for (uint i = 0; i < links.length; i++) {
            if (links[i].wallet == wallet) {
                if (links[i].verified) {
                    verifiedWallets[wallet] = false;
                }
                // Remove the link by replacing it with the last element and popping
                links[i] = links[links.length - 1];
                links.pop();
                emit WalletUnlinked(avatarId, wallet);
                return;
            }
        }
        revert("Wallet link not found");
    }

    function getAvatarWallets(uint256 avatarId) external view returns (WalletLink[] memory) {
        return avatarWallets[avatarId];
    }

    function isWalletVerified(address wallet) external view returns (bool) {
        return verifiedWallets[wallet];
    }
}