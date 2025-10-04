// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EscrowContract
 * @notice Holds SGL tokens in escrow on behalf of beneficiaries until an
 * unlock timestamp has passed.
 */
contract EscrowContract is Ownable {
    struct Lock {
        address beneficiary;
        uint256 amount;
        uint256 unlockTime;
        bool released;
    }

    IERC20 public immutable sgl;

    mapping(uint256 capsuleId => Lock) public locks;

    event FundsLocked(uint256 indexed capsuleId, address indexed beneficiary, uint256 amount, uint256 unlockTime);
    event FundsReleased(uint256 indexed capsuleId, address indexed beneficiary, uint256 amount);

    constructor(address token) {
        require(token != address(0), "invalid token");
        sgl = IERC20(token);
    }

    function lockFunds(uint256 capsuleId, address beneficiary, uint256 amount, uint256 unlockTime)
        external
        onlyOwner
    {
        Lock storage existing = locks[capsuleId];
        require(!existing.released && existing.amount == 0, "Already locked");
        require(beneficiary != address(0), "invalid beneficiary");
        require(amount > 0, "transfer failed");

        if (!_transferFrom(_msgSender(), address(this), amount)) {
            revert("transfer failed");
        }

        locks[capsuleId] = Lock({
            beneficiary: beneficiary,
            amount: amount,
            unlockTime: unlockTime,
            released: false
        });

        emit FundsLocked(capsuleId, beneficiary, amount, unlockTime);
    }

    function releaseFunds(uint256 capsuleId) external {
        Lock storage data = locks[capsuleId];
        require(data.amount > 0, "no lock");
        require(!data.released, "already released");
        require(_msgSender() == data.beneficiary, "not beneficiary");
        require(block.timestamp >= data.unlockTime, "not ready");

        data.released = true;

        if (!_transfer(data.beneficiary, data.amount)) {
            revert("transfer failed");
        }

        emit FundsReleased(capsuleId, data.beneficiary, data.amount);
    }

    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "invalid to");
        if (!_transfer(to, amount)) {
            revert("transfer failed");
        }
    }

    function _transferFrom(address from, address to, uint256 amount) private returns (bool) {
        try sgl.transferFrom(from, to, amount) returns (bool success) {
            return success;
        } catch {
            return false;
        }
    }

    function _transfer(address to, uint256 amount) private returns (bool) {
        try sgl.transfer(to, amount) returns (bool success) {
            return success;
        } catch {
            return false;
        }
    }
}
