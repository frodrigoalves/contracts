// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title StakingPool
 * @notice Minimal staking pool for SGL tokens supporting deposits and
 * withdrawals with reentrancy protection.
 */
contract StakingPool is ReentrancyGuard {
    IERC20 public immutable sgl;

    mapping(address account => uint256) public balances;
    uint256 public totalStaked;

    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);

    constructor(address token) {
        require(token != address(0), "invalid token");
        sgl = IERC20(token);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "zero");

        if (!_transferFrom(msg.sender, address(this), amount)) {
            revert("transfer failed");
        }

        balances[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        uint256 staked = balances[msg.sender];
        require(amount > 0 && staked >= amount, "insufficient");

        balances[msg.sender] = staked - amount;
        totalStaked -= amount;

        if (!_transfer(msg.sender, amount)) {
            revert("transfer failed");
        }

        emit Unstaked(msg.sender, amount);
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
