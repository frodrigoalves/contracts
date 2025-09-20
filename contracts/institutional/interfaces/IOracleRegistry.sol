// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleRegistry {
    function validateEvent(bytes32 eventHash) external;
    function isEventValid(bytes32 eventHash) external view returns (bool);
}