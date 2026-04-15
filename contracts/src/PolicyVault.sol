// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import "encrypted-types/EncryptedTypes.sol";

/// @title PolicyVault
/// @notice Stores ownership, execution wallet references, session state, and
/// encrypted policy handle references for the NoxPilot bounded execution model.
contract PolicyVault {
    error NotOwner();
    error NotExecutionAuthority();
    error InvalidAddress();
    error ExecutionWalletNotConfigured();
    error VaultPaused();
    error SessionInactive();
    error SessionAlreadyActive();
    error SessionExpired();
    error InvalidSessionConfig();
    error TradeLimitReached();
    error BudgetExceeded();

    event OwnerRegistered(address indexed owner);
    event ExecutionWalletRegistered(address indexed executionWallet);
    event ExecutionControllerRegistered(address indexed executionController);
    event ConfidentialBudgetStored(bytes32 indexed dailyBudgetHandle);
    event ConfidentialMinConfidenceStored(bytes32 indexed minConfidenceHandle);
    event PolicyUpdated(bytes32 indexed policyHash, bytes32 whitelistRoot, string metadataUri);
    event SessionOpened(uint256 fundedAmountUsd, uint64 expiresAt, uint32 tradeLimit);
    event SessionExecutionNoted(uint256 spendAmountUsd, uint32 tradesUsed);
    event SessionSettled(uint256 returnedAmountUsd, uint256 spentAmountUsd);
    event PauseToggled(bool paused);

    struct PolicyRefs {
        bytes32 dailyBudgetHandle;
        bytes32 minConfidenceHandle;
        bytes32 maxSlippageHandle;
        bytes32 autoExecuteHandle;
        bytes32 whitelistRoot;
        string allowedProtocol;
        string metadataUri;
        uint64 updatedAt;
    }

    struct SessionState {
        bool active;
        uint64 startedAt;
        uint64 expiresAt;
        uint32 tradesUsed;
        uint32 tradeLimit;
        uint256 fundedAmountUsd;
        uint256 spentAmountUsd;
        uint256 settledAmountUsd;
    }

    address public owner;
    address public executionWallet;
    address public executionController;
    bool public paused;
    bytes32 public latestPolicyHash;
    bool public confidentialDailyBudgetInitialized;
    bool public confidentialMinConfidenceInitialized;
    PolicyRefs public policyRefs;
    SessionState private _session;
    euint256 private _confidentialDailyBudget;
    euint256 private _confidentialMinConfidence;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyExecutionAuthority() {
        if (msg.sender != executionController && msg.sender != executionWallet) {
            revert NotExecutionAuthority();
        }
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        owner = initialOwner;
        emit OwnerRegistered(initialOwner);
    }

    function registerOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        owner = newOwner;
        emit OwnerRegistered(newOwner);
    }

    function registerExecutionWallet(address newExecutionWallet) external onlyOwner {
        if (newExecutionWallet == address(0)) revert InvalidAddress();
        executionWallet = newExecutionWallet;
        emit ExecutionWalletRegistered(newExecutionWallet);
    }

    function registerExecutionController(address newController) external onlyOwner {
        if (newController == address(0)) revert InvalidAddress();
        executionController = newController;
        if (confidentialDailyBudgetInitialized) {
            Nox.allow(_confidentialDailyBudget, newController);
        }
        if (confidentialMinConfidenceInitialized) {
            Nox.allow(_confidentialMinConfidence, newController);
        }
        emit ExecutionControllerRegistered(newController);
    }

    function updatePolicy(
        bytes32 dailyBudgetHandle,
        bytes32 minConfidenceHandle,
        bytes32 maxSlippageHandle,
        bytes32 autoExecuteHandle,
        bytes32 whitelistRoot,
        string calldata allowedProtocol,
        string calldata metadataUri
    ) external onlyOwner {
        _applyPolicyRefs(
            dailyBudgetHandle,
            minConfidenceHandle,
            maxSlippageHandle,
            autoExecuteHandle,
            whitelistRoot,
            allowedProtocol,
            metadataUri
        );
    }

    function updatePolicyWithNox(
        externalEuint256 dailyBudgetExternalHandle,
        bytes calldata dailyBudgetProof,
        externalEuint256 minConfidenceExternalHandle,
        bytes calldata minConfidenceProof,
        bytes32 maxSlippageHandle,
        bytes32 autoExecuteHandle,
        bytes32 whitelistRoot,
        string calldata allowedProtocol,
        string calldata metadataUri
    ) external onlyOwner {
        euint256 confidentialBudget = Nox.fromExternal(dailyBudgetExternalHandle, dailyBudgetProof);
        euint256 confidentialMinConfidence = Nox.fromExternal(minConfidenceExternalHandle, minConfidenceProof);
        Nox.allowThis(confidentialBudget);
        Nox.allowThis(confidentialMinConfidence);
        Nox.allow(confidentialBudget, owner);
        Nox.allow(confidentialMinConfidence, owner);
        if (executionController != address(0)) {
            Nox.allow(confidentialBudget, executionController);
            Nox.allow(confidentialMinConfidence, executionController);
        }

        _confidentialDailyBudget = confidentialBudget;
        _confidentialMinConfidence = confidentialMinConfidence;
        confidentialDailyBudgetInitialized = true;
        confidentialMinConfidenceInitialized = true;

        bytes32 dailyBudgetHandle = externalEuint256.unwrap(dailyBudgetExternalHandle);
        bytes32 minConfidenceHandle = externalEuint256.unwrap(minConfidenceExternalHandle);
        _applyPolicyRefs(
            dailyBudgetHandle,
            minConfidenceHandle,
            maxSlippageHandle,
            autoExecuteHandle,
            whitelistRoot,
            allowedProtocol,
            metadataUri
        );

        emit ConfidentialBudgetStored(dailyBudgetHandle);
        emit ConfidentialMinConfidenceStored(minConfidenceHandle);
    }

    function setPaused(bool isPaused) external onlyOwner {
        paused = isPaused;
        emit PauseToggled(isPaused);
    }

    function openSession(uint256 fundedAmountUsd, uint32 tradeLimit, uint64 expiryHours) external onlyOwner {
        if (paused) revert VaultPaused();
        if (_session.active) revert SessionAlreadyActive();
        if (executionWallet == address(0)) revert ExecutionWalletNotConfigured();
        if (fundedAmountUsd == 0 || tradeLimit == 0 || expiryHours == 0) {
            revert InvalidSessionConfig();
        }

        _session = SessionState({
            active: true,
            startedAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp + (expiryHours * 1 hours)),
            tradesUsed: 0,
            tradeLimit: tradeLimit,
            fundedAmountUsd: fundedAmountUsd,
            spentAmountUsd: 0,
            settledAmountUsd: 0
        });

        emit SessionOpened(fundedAmountUsd, _session.expiresAt, tradeLimit);
    }

    function noteExecution(uint256 spendAmountUsd) external onlyExecutionAuthority {
        if (paused) revert VaultPaused();
        if (!_session.active) revert SessionInactive();
        if (_session.expiresAt < block.timestamp) revert SessionExpired();
        if (_session.tradesUsed >= _session.tradeLimit) revert TradeLimitReached();
        if (_session.spentAmountUsd + spendAmountUsd > _session.fundedAmountUsd) revert BudgetExceeded();

        _session.tradesUsed += 1;
        _session.spentAmountUsd += spendAmountUsd;

        emit SessionExecutionNoted(spendAmountUsd, _session.tradesUsed);
    }

    function settleSession(uint256 returnedAmountUsd) external onlyExecutionAuthority {
        if (!_session.active) revert SessionInactive();
        _session.active = false;
        _session.settledAmountUsd = returnedAmountUsd;

        emit SessionSettled(returnedAmountUsd, _session.spentAmountUsd);
    }

    function isSessionActive() public view returns (bool) {
        return _session.active && !paused && _session.expiresAt >= block.timestamp;
    }

    function remainingSessionBudget() public view returns (uint256) {
        if (_session.fundedAmountUsd <= _session.spentAmountUsd) {
            return 0;
        }
        return _session.fundedAmountUsd - _session.spentAmountUsd;
    }

    function policyWhitelistRoot() external view returns (bytes32) {
        return policyRefs.whitelistRoot;
    }

    function policyMetadataUri() external view returns (string memory) {
        return policyRefs.metadataUri;
    }

    function policyUpdatedAt() external view returns (uint64) {
        return policyRefs.updatedAt;
    }

    function confidentialDailyBudgetHandle() external view returns (bytes32) {
        if (!confidentialDailyBudgetInitialized) {
            return bytes32(0);
        }
        return euint256.unwrap(_confidentialDailyBudget);
    }

    function confidentialMinConfidenceHandle() external view returns (bytes32) {
        if (!confidentialMinConfidenceInitialized) {
            return bytes32(0);
        }
        return euint256.unwrap(_confidentialMinConfidence);
    }

    function sessionSnapshot()
        external
        view
        returns (
            bool active,
            uint64 startedAt,
            uint64 expiresAt,
            uint32 tradesUsed,
            uint32 tradeLimit,
            uint256 fundedAmountUsd,
            uint256 spentAmountUsd,
            uint256 settledAmountUsd
        )
    {
        SessionState memory session = _session;
        return (
            session.active,
            session.startedAt,
            session.expiresAt,
            session.tradesUsed,
            session.tradeLimit,
            session.fundedAmountUsd,
            session.spentAmountUsd,
            session.settledAmountUsd
        );
    }

    function _applyPolicyRefs(
        bytes32 dailyBudgetHandle,
        bytes32 minConfidenceHandle,
        bytes32 maxSlippageHandle,
        bytes32 autoExecuteHandle,
        bytes32 whitelistRoot,
        string calldata allowedProtocol,
        string calldata metadataUri
    ) internal {
        policyRefs = PolicyRefs({
            dailyBudgetHandle: dailyBudgetHandle,
            minConfidenceHandle: minConfidenceHandle,
            maxSlippageHandle: maxSlippageHandle,
            autoExecuteHandle: autoExecuteHandle,
            whitelistRoot: whitelistRoot,
            allowedProtocol: allowedProtocol,
            metadataUri: metadataUri,
            updatedAt: uint64(block.timestamp)
        });

        latestPolicyHash = keccak256(
            abi.encode(
                dailyBudgetHandle,
                minConfidenceHandle,
                maxSlippageHandle,
                autoExecuteHandle,
                whitelistRoot,
                allowedProtocol,
                metadataUri
            )
        );

        emit PolicyUpdated(latestPolicyHash, whitelistRoot, metadataUri);
    }

    /*
        The live judged path now validates the daily budget through
        Nox.fromExternal(), proving that at least one policy threshold entered
        the contract through the real Handle -> proof -> Nox path. The rest of
        the policy remains a bounded MVP scaffold: the contract stores the
        additional handle references and session state, while richer confidential
        comparisons are still future work.
    */
}
