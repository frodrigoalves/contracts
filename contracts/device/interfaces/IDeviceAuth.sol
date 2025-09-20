// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDeviceAuth {
    function startAuthSession(bytes32 deviceId) external returns (bytes32);
    function completeAuthSession(
        bytes32 sessionId,
        bytes memory challengeResponse,
        bytes memory signature
    ) external returns (bool);
    function logSecurityEvent(
        bytes32 deviceId,
        string memory eventType,
        string memory proofData
    ) external;
}