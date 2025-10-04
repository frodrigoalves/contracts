// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

interface ISGLToken is IERC20 {
    function burn(uint256 value) external;
}

/**
 * @title FeeManager
 * @notice Handles the collection and distribution of protocol fees for the
 * SingulAI ecosystem.
 */
contract FeeManager is Context, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 public constant BURN_PERCENT = 2;
    uint256 public constant OPS_PERCENT = 30;
    uint256 public constant ORACLE_PERCENT = 20;

    address public opsWallet;
    address public oracleWallet;

    ISGLToken public immutable sgl;

    event FeeCollected(address indexed payer, uint256 amount);
    event WalletsUpdated(address indexed ops, address indexed oracle);

    constructor(address token) {
        require(token != address(0), "invalid token");

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MANAGER_ROLE, _msgSender());

        sgl = ISGLToken(token);
        opsWallet = _msgSender();
        oracleWallet = _msgSender();
    }

    function collectAndDistribute(address payer, uint256 amount) external onlyRole(MANAGER_ROLE) {
        require(amount > 0, "transfer failed");

        if (!_transferFrom(payer, address(this), amount)) {
            revert("transfer failed");
        }

        uint256 burnAmount = (amount * BURN_PERCENT) / 100;
        uint256 opsAmount = (amount * OPS_PERCENT) / 100;
        uint256 oracleAmount = (amount * ORACLE_PERCENT) / 100;

        if (burnAmount > 0) {
            try sgl.burn(burnAmount) {
                // burn succeeded
            } catch {
                revert("transfer failed");
            }
        }

        if (opsAmount > 0 && opsWallet != address(0)) {
            if (!_transfer(opsWallet, opsAmount)) {
                revert("transfer failed");
            }
        }

        if (oracleAmount > 0 && oracleWallet != address(0)) {
            if (!_transfer(oracleWallet, oracleAmount)) {
                revert("transfer failed");
            }
        }

        emit FeeCollected(payer, amount);
    }

    function updateWallets(address newOps, address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        opsWallet = newOps;
        oracleWallet = newOracle;
        emit WalletsUpdated(newOps, newOracle);
    }

    function burnPercent() external pure returns (uint256) {
        return BURN_PERCENT;
    }

    function opsPercent() external pure returns (uint256) {
        return OPS_PERCENT;
    }

    function oraclePercent() external pure returns (uint256) {
        return ORACLE_PERCENT;
    }

    function burnAddress() external pure returns (address) {
        return address(0);
    }

    function _checkRole(bytes32 role, address account) internal view override {
        if (!hasRole(role, account)) {
            revert("AccessControl:");
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
