// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {PolicyVault} from "../src/PolicyVault.sol";

contract PolicyVaultTest {
    function testPolicyLifecycleAndSessionAccounting() public {
        PolicyVault vault = new PolicyVault(address(this));
        bytes32 whitelistRoot = keccak256(bytes("ARB,ETH,LINK"));

        vault.registerExecutionWallet(address(this));
        vault.registerExecutionController(address(this));
        vault.updatePolicy(
            bytes32(uint256(1)),
            bytes32(uint256(2)),
            bytes32(uint256(3)),
            bytes32(uint256(4)),
            whitelistRoot,
            "uniswap-v3",
            "ipfs://policy-1"
        );

        require(vault.policyWhitelistRoot() == whitelistRoot, "whitelist root not stored");
        require(
            keccak256(bytes(vault.policyMetadataUri())) == keccak256(bytes("ipfs://policy-1")),
            "metadata uri not stored"
        );

        vault.openSession(1_000, 1, 12);
        require(vault.isSessionActive(), "session should be active");

        vault.noteExecution(400);
        require(vault.remainingSessionBudget() == 600, "remaining budget mismatch");

        vault.settleSession(950);

        (
            bool active,
            ,
            ,
            uint32 tradesUsed,
            uint32 tradeLimit,
            uint256 fundedAmountUsd,
            uint256 spentAmountUsd,
            uint256 settledAmountUsd
        ) = vault.sessionSnapshot();

        require(!active, "session should be settled");
        require(tradesUsed == 1, "trades used mismatch");
        require(tradeLimit == 1, "trade limit mismatch");
        require(fundedAmountUsd == 1_000, "funded amount mismatch");
        require(spentAmountUsd == 400, "spent amount mismatch");
        require(settledAmountUsd == 950, "settled amount mismatch");
    }

    function testOpenSessionRejectsInvalidConfig() public {
        PolicyVault vault = new PolicyVault(address(this));
        vault.registerExecutionWallet(address(this));

        (bool fundedOk, ) =
            address(vault).call(abi.encodeWithSignature("openSession(uint256,uint32,uint64)", 0, 1, 1));
        require(!fundedOk, "zero funding should revert");

        (bool tradeLimitOk, ) =
            address(vault).call(abi.encodeWithSignature("openSession(uint256,uint32,uint64)", 100, 0, 1));
        require(!tradeLimitOk, "zero trade limit should revert");

        (bool expiryOk, ) =
            address(vault).call(abi.encodeWithSignature("openSession(uint256,uint32,uint64)", 100, 1, 0));
        require(!expiryOk, "zero expiry should revert");
    }
}
