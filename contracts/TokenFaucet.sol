// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenFaucet is Ownable {
    IERC20 public token;
    uint256 public constant FAUCET_AMOUNT = 50 * 10**18; // 50 tokens
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    mapping(address => uint256) public lastRequest;

    event TokensRequested(address indexed user, uint256 amount);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function requestTokens() external {
        require(block.timestamp >= lastRequest[msg.sender] + COOLDOWN_PERIOD, "Cooldown active");
        require(token.balanceOf(address(this)) >= FAUCET_AMOUNT, "Insufficient faucet balance");

        lastRequest[msg.sender] = block.timestamp;
        token.transfer(msg.sender, FAUCET_AMOUNT);
        emit TokensRequested(msg.sender, FAUCET_AMOUNT);
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        token.transfer(owner(), amount);
    }
}