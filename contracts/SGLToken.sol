// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SGLToken
 * @notice ERC20 token used across the SingulAI contracts. It supports
 * role-based minting, a transfer burn mechanic and pausability.
 */
contract SGLToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public constant BURN_PERCENT = 2; // 2% burn on each transfer

    uint256 private _burnedBalance;

    event TransferWithBurn(address indexed from, address indexed burnTo, uint256 amount);

    constructor(address admin, uint256 initialSupply) ERC20("SingulAI Token", "SGL") {
        require(admin != address(0), "invalid admin");

        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(BURNER_ROLE, admin);

        _mint(admin, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (account == address(0)) {
            return _burnedBalance;
        }
        return super.balanceOf(account);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        if (sender != address(0) && recipient != address(0) && amount > 0) {
            uint256 burnAmount = (amount * BURN_PERCENT) / 100;
            if (burnAmount > 0) {
                _burn(sender, burnAmount);
                emit TransferWithBurn(sender, address(0), burnAmount);
                amount -= burnAmount;
            }
        }

        super._transfer(sender, recipient, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20) {
        super._burn(account, amount);
        if (amount > 0) {
            _burnedBalance += amount;
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _checkRole(bytes32 role, address account) internal view override {
        if (!hasRole(role, account)) {
            revert("AccessControl:");
        }
    }
}
