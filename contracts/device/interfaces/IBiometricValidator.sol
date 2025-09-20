// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBiometricValidator {
    function startValidation(bytes32 deviceId) external returns (bytes32);
    function validateBiometric(
        bytes32 sessionId,
        bytes32 deviceId,
        string memory biometricType,
        bytes32 dataHash,
        bytes memory signature
    ) external returns (bool);
    function completeValidation(bytes32 sessionId, bytes32 deviceId) external returns (bool);
}