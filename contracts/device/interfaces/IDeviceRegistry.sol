// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDeviceRegistry {
    function getDevice(bytes32 deviceId) external view returns (
        string memory serialNumber,
        string memory deviceType,
        address owner,
        uint256 registrationDate,
        bytes32 firmwareHash,
        bool active,
        string memory certifications,
        bytes memory publicKey
    );
}