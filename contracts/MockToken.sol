// SPDX-License-Identifier: MIT
// SingulAI Project – MVP Test Token
// Author: Rodrigo Alves Ferreira

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("SingulAI Test Token", "tSGL") {
        _mint(msg.sender, initialSupply);
    }
}
