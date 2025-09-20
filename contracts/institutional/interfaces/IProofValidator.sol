// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProofValidator {
    function validateProof(
        bytes32 proofHash,
        string calldata proofData,
        bytes calldata signature,
        address institution
    ) external returns (bool);
}