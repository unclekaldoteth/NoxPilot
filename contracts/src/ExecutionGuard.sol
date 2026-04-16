// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import "encrypted-types/EncryptedTypes.sol";

interface IPolicyVaultLike {
    function owner() external view returns (address);
    function executionWallet() external view returns (address);
    function paused() external view returns (bool);
    function isSessionActive() external view returns (bool);
    function remainingSessionBudget() external view returns (uint256);
    function policyWhitelistRoot() external view returns (bytes32);
    function policyUpdatedAt() external view returns (uint64);
    function confidentialMinConfidenceInitialized() external view returns (bool);
    function confidentialMinConfidenceHandle() external view returns (bytes32);
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
        );
    function noteExecution(uint256 spendAmountUsd) external;
    function settleSession(uint256 returnedAmountUsd) external;
}

interface IERC20Like {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISwapRouterLike {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IConfidentialWrapperLike {
    function underlying() external view returns (address);
    function wrap(address to, uint256 amount) external returns (euint256);
    function confidentialBalanceHandleOf(address account) external view returns (bytes32);
}

/// @title ExecutionGuard
/// @notice Enforces bounded session rules and executes one whitelisted exact-input
/// swap through a configured router for the NoxPilot live demo flow.
contract ExecutionGuard {
    error InvalidAddress();
    error NotAdmin();
    error NotExecutionWallet();
    error NotAuthorizedOperator();
    error NotSessionFunder();
    error TokenNotAllowed();
    error SessionUnavailable();
    error ConfidenceTooLow();
    error BudgetExceeded();
    error TradeLimitReached();
    error PolicyReferenceOutOfSync();
    error MissingConfidenceApproval();
    error MissingConfidentialThreshold();
    error AssetTransferFailed();
    error AssetApprovalFailed();
    error ZeroAmount();
    error InsufficientSessionAsset();
    error WrapperNotConfigured();
    error WrapperUnderlyingMismatch();
    error NoSwapOutput();
    error WrapAmountExceedsBalance();
    error MissingConfidentialBalanceHandle();

    event AdminRegistered(address indexed admin);
    event AllowedTokenUpdated(bytes32 indexed tokenHash, bool allowed);
    event AllowedTokenAddressUpdated(address indexed tokenAddress, bool allowed);
    event ConfidentialWrapperUpdated(address indexed tokenAddress, address indexed wrapper, bool allowed);
    event PolicyWhitelistRootSynced(bytes32 indexed whitelistRoot);
    event SessionAssetFunded(address indexed funder, uint256 amount, bytes32 fundingRef);
    event ConfidenceApprovalPrepared(address indexed operator, uint256 observedConfidence, bytes32 indexed approvalHandle);
    event ExecutionApproved(bytes32 indexed tokenHash, uint256 spendAmountUsd, bytes32 executionRef);
    event ExecutionRejected(bytes32 indexed tokenHash, string reason, bytes32 executionRef);
    event SwapExecuted(
        bytes32 indexed tokenHash,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 executionRef
    );
    event ConfidentialAssetWrapped(
        address indexed tokenAddress,
        address indexed wrapper,
        address indexed owner,
        uint256 amount,
        bytes32 amountHandle,
        bytes32 balanceHandle,
        bytes32 wrapRef
    );
    event SettlementRecorded(uint256 returnedAmountUsd, bytes32 settlementRef);
    event SessionAssetsSettled(uint256 returnedAmountUsd, bytes32 settlementRef);

    IPolicyVaultLike internal immutable POLICY_VAULT;
    address public admin;
    address public immutable sessionAsset;
    address public immutable swapRouter;
    uint24 public immutable defaultPoolFee;
    uint256 public lastExecutionAt;
    uint256 public lastSettlementAt;
    uint256 public lastWrapAt;
    uint256 public lastAmountIn;
    uint256 public lastAmountOut;
    uint256 public lastWrapAmount;
    bytes32 public syncedWhitelistRoot;
    address public lastSwapToken;
    address public lastWrapToken;
    address public lastWrapWrapper;
    bytes32 public lastWrapAmountHandle;
    bytes32 public lastWrapBalanceHandle;
    mapping(address => bytes32) public pendingConfidenceApprovalHandles;
    mapping(address => uint256) public pendingConfidenceObserved;
    mapping(address => uint64) public pendingConfidencePolicyUpdatedAt;
    mapping(address => uint64) public pendingConfidenceSessionStartedAt;
    mapping(bytes32 => bool) public allowedTokenHashes;
    mapping(address => bool) public allowedTokenAddresses;
    mapping(address => address) public confidentialWrappers;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyExecutionWallet() {
        if (msg.sender != POLICY_VAULT.executionWallet()) revert NotExecutionWallet();
        _;
    }

    modifier onlyAuthorizedOperator() {
        address executionWalletAddress = POLICY_VAULT.executionWallet();
        address ownerAddress = POLICY_VAULT.owner();
        if (msg.sender != admin && msg.sender != ownerAddress && msg.sender != executionWalletAddress) {
            revert NotAuthorizedOperator();
        }
        _;
    }

    modifier onlySessionFunder() {
        if (msg.sender != admin && msg.sender != POLICY_VAULT.owner()) {
            revert NotSessionFunder();
        }
        _;
    }

    constructor(
        address policyVaultAddress,
        address initialAdmin,
        address sessionAssetAddress,
        address swapRouterAddress,
        uint24 poolFee
    ) {
        if (
            policyVaultAddress == address(0) ||
            initialAdmin == address(0) ||
            sessionAssetAddress == address(0) ||
            swapRouterAddress == address(0)
        ) revert InvalidAddress();

        POLICY_VAULT = IPolicyVaultLike(policyVaultAddress);
        admin = initialAdmin;
        sessionAsset = sessionAssetAddress;
        swapRouter = swapRouterAddress;
        defaultPoolFee = poolFee;
        emit AdminRegistered(initialAdmin);
    }

    function policyVault() external view returns (address) {
        return address(POLICY_VAULT);
    }

    function sessionAssetBalance() public view returns (uint256) {
        return IERC20Like(sessionAsset).balanceOf(address(this));
    }

    function registerAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress();
        admin = newAdmin;
        emit AdminRegistered(newAdmin);
    }

    function syncPolicyWhitelistRoot() external onlyAdmin returns (bytes32 whitelistRoot) {
        whitelistRoot = POLICY_VAULT.policyWhitelistRoot();
        if (whitelistRoot == bytes32(0)) revert PolicyReferenceOutOfSync();

        syncedWhitelistRoot = whitelistRoot;
        emit PolicyWhitelistRootSynced(whitelistRoot);
    }

    function setAllowedToken(bytes32 tokenHash, bool allowed) external onlyAdmin {
        allowedTokenHashes[tokenHash] = allowed;
        emit AllowedTokenUpdated(tokenHash, allowed);
    }

    function setAllowedTokenAddress(address tokenAddress, bool allowed) external onlyAdmin {
        if (tokenAddress == address(0)) revert InvalidAddress();
        allowedTokenAddresses[tokenAddress] = allowed;
        emit AllowedTokenAddressUpdated(tokenAddress, allowed);
    }

    function setConfidentialWrapper(address tokenAddress, address wrapper, bool allowed) external onlyAdmin {
        if (tokenAddress == address(0)) revert InvalidAddress();
        if (!allowed) {
            delete confidentialWrappers[tokenAddress];
            emit ConfidentialWrapperUpdated(tokenAddress, address(0), false);
            return;
        }
        if (wrapper == address(0)) revert InvalidAddress();
        if (IConfidentialWrapperLike(wrapper).underlying() != tokenAddress) revert WrapperUnderlyingMismatch();

        confidentialWrappers[tokenAddress] = wrapper;
        emit ConfidentialWrapperUpdated(tokenAddress, wrapper, true);
    }

    function previewExecution(
        bytes32 tokenHash,
        address caller,
        uint256 spendAmountUsd,
        uint256 observedConfidence
    ) public view returns (bool allowed, string memory reason) {
        address executionWalletAddress = POLICY_VAULT.executionWallet();
        address ownerAddress = POLICY_VAULT.owner();
        if (caller != admin && caller != ownerAddress && caller != executionWalletAddress) {
            return (false, "caller is not an authorized execution operator");
        }

        if (POLICY_VAULT.paused() || !POLICY_VAULT.isSessionActive()) {
            return (false, "session is inactive or paused");
        }

        if (syncedWhitelistRoot == bytes32(0) || syncedWhitelistRoot != POLICY_VAULT.policyWhitelistRoot()) {
            return (false, "token reference list is out of sync with vault policy");
        }

        if (!allowedTokenHashes[tokenHash]) {
            return (false, "token is not on the approved reference list");
        }

        (, , , uint32 tradesUsed, uint32 tradeLimit, , , ) = POLICY_VAULT.sessionSnapshot();
        if (tradesUsed >= tradeLimit) {
            return (false, "trade limit reached");
        }

        if (spendAmountUsd > POLICY_VAULT.remainingSessionBudget()) {
            return (false, "spend amount exceeds remaining session budget");
        }

        if (pendingConfidenceApprovalHandles[caller] == bytes32(0)) {
            return (false, "confidential confidence approval has not been prepared");
        }

        if (pendingConfidenceObserved[caller] != observedConfidence) {
            return (false, "prepared confidence approval does not match the current recommendation");
        }

        uint64 currentPolicyUpdatedAt = POLICY_VAULT.policyUpdatedAt();
        if (pendingConfidencePolicyUpdatedAt[caller] != currentPolicyUpdatedAt) {
            return (false, "prepared confidence approval is stale after policy update");
        }

        (, uint64 sessionStartedAt, , , , , , ) = POLICY_VAULT.sessionSnapshot();
        if (pendingConfidenceSessionStartedAt[caller] != sessionStartedAt) {
            return (false, "prepared confidence approval is stale for the current session");
        }

        return (true, "execution approved");
    }

    function prepareConfidenceApproval(uint256 observedConfidence) external onlyAuthorizedOperator returns (bytes32 approvalHandle) {
        if (!POLICY_VAULT.confidentialMinConfidenceInitialized()) revert MissingConfidentialThreshold();
        if (POLICY_VAULT.paused() || !POLICY_VAULT.isSessionActive()) revert SessionUnavailable();

        (, uint64 sessionStartedAt, , , , , , ) = POLICY_VAULT.sessionSnapshot();
        if (sessionStartedAt == 0) revert SessionUnavailable();

        euint256 confidentialMinConfidence = euint256.wrap(POLICY_VAULT.confidentialMinConfidenceHandle());
        euint256 observedConfidenceHandle = Nox.toEuint256(observedConfidence);
        Nox.allowThis(observedConfidenceHandle);

        ebool approval = Nox.le(confidentialMinConfidence, observedConfidenceHandle);
        Nox.allowThis(approval);
        Nox.allowPublicDecryption(approval);

        approvalHandle = ebool.unwrap(approval);
        pendingConfidenceApprovalHandles[msg.sender] = approvalHandle;
        pendingConfidenceObserved[msg.sender] = observedConfidence;
        pendingConfidencePolicyUpdatedAt[msg.sender] = POLICY_VAULT.policyUpdatedAt();
        pendingConfidenceSessionStartedAt[msg.sender] = sessionStartedAt;

        emit ConfidenceApprovalPrepared(msg.sender, observedConfidence, approvalHandle);
    }

    function fundSessionAsset(uint256 amount, bytes32 fundingRef) external onlySessionFunder {
        if (POLICY_VAULT.paused() || !POLICY_VAULT.isSessionActive()) revert SessionUnavailable();
        if (amount == 0) revert ZeroAmount();

        _safeTransferFrom(sessionAsset, msg.sender, address(this), amount);
        emit SessionAssetFunded(msg.sender, amount, fundingRef);
    }

    function executeExactInputSingle(
        bytes32 tokenHash,
        address tokenOut,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 spendAmountUsd,
        uint256 observedConfidence,
        bytes calldata confidenceApprovalProof,
        bytes32 executionRef
    ) external onlyAuthorizedOperator returns (uint256 amountOut) {
        if (tokenOut == address(0)) revert InvalidAddress();
        if (amountIn == 0) revert ZeroAmount();

        (bool allowed, string memory reason) = previewExecution(tokenHash, msg.sender, spendAmountUsd, observedConfidence);

        if (!allowed) {
            emit ExecutionRejected(tokenHash, reason, executionRef);
            return 0;
        }

        bytes32 approvalHandle = pendingConfidenceApprovalHandles[msg.sender];
        if (approvalHandle == bytes32(0)) revert MissingConfidenceApproval();

        bool confidenceApproved = Nox.publicDecrypt(ebool.wrap(approvalHandle), confidenceApprovalProof);
        if (!confidenceApproved) {
            _clearConfidenceApproval(msg.sender);
            emit ExecutionRejected(tokenHash, "recommendation confidence is below the confidential policy threshold", executionRef);
            return 0;
        }

        if (!allowedTokenAddresses[tokenOut]) revert TokenNotAllowed();
        if (amountIn > sessionAssetBalance()) revert InsufficientSessionAsset();

        _safeApprove(sessionAsset, swapRouter, 0);
        _safeApprove(sessionAsset, swapRouter, amountIn);

        ISwapRouterLike.ExactInputSingleParams memory params = ISwapRouterLike.ExactInputSingleParams({
            tokenIn: sessionAsset,
            tokenOut: tokenOut,
            fee: poolFee == 0 ? defaultPoolFee : poolFee,
            recipient: address(this),
            deadline: block.timestamp + 15 minutes,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouterLike(swapRouter).exactInputSingle(params);

        POLICY_VAULT.noteExecution(spendAmountUsd);
        lastExecutionAt = block.timestamp;
        lastSwapToken = tokenOut;
        lastAmountIn = amountIn;
        lastAmountOut = amountOut;
        _clearConfidenceApproval(msg.sender);

        emit ExecutionApproved(tokenHash, spendAmountUsd, executionRef);
        emit SwapExecuted(tokenHash, tokenOut, amountIn, amountOut, executionRef);
    }

    function wrapLastOutput(
        address tokenOut,
        uint256 amount,
        bytes32 wrapRef
    ) external onlyAuthorizedOperator returns (bytes32 amountHandle, bytes32 balanceHandle) {
        if (tokenOut == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        if (POLICY_VAULT.paused() || !POLICY_VAULT.isSessionActive()) revert SessionUnavailable();
        if (lastSwapToken == address(0) || tokenOut != lastSwapToken) revert NoSwapOutput();
        if (!allowedTokenAddresses[tokenOut]) revert TokenNotAllowed();

        address wrapper = confidentialWrappers[tokenOut];
        if (wrapper == address(0)) revert WrapperNotConfigured();
        if (IConfidentialWrapperLike(wrapper).underlying() != tokenOut) revert WrapperUnderlyingMismatch();

        uint256 availableBalance = IERC20Like(tokenOut).balanceOf(address(this));
        if (availableBalance == 0 || amount > availableBalance) revert WrapAmountExceedsBalance();

        _safeApprove(tokenOut, wrapper, 0);
        _safeApprove(tokenOut, wrapper, amount);

        euint256 wrappedAmount = IConfidentialWrapperLike(wrapper).wrap(POLICY_VAULT.owner(), amount);
        amountHandle = euint256.unwrap(wrappedAmount);
        balanceHandle = IConfidentialWrapperLike(wrapper).confidentialBalanceHandleOf(POLICY_VAULT.owner());
        if (balanceHandle == bytes32(0)) revert MissingConfidentialBalanceHandle();

        lastWrapAt = block.timestamp;
        lastWrapToken = tokenOut;
        lastWrapWrapper = wrapper;
        lastWrapAmount = amount;
        lastWrapAmountHandle = amountHandle;
        lastWrapBalanceHandle = balanceHandle;

        emit ConfidentialAssetWrapped(
            tokenOut,
            wrapper,
            POLICY_VAULT.owner(),
            amount,
            amountHandle,
            balanceHandle,
            wrapRef
        );
    }

    function recordExecution(
        bytes32 tokenHash,
        uint256 spendAmountUsd,
        uint256 observedConfidence,
        bytes calldata confidenceApprovalProof,
        bytes32 executionRef
    ) external onlyAuthorizedOperator returns (bool) {
        (bool allowed, string memory reason) = previewExecution(tokenHash, msg.sender, spendAmountUsd, observedConfidence);

        if (!allowed) {
            emit ExecutionRejected(tokenHash, reason, executionRef);
            return false;
        }

        bytes32 approvalHandle = pendingConfidenceApprovalHandles[msg.sender];
        if (approvalHandle == bytes32(0)) revert MissingConfidenceApproval();

        bool confidenceApproved = Nox.publicDecrypt(ebool.wrap(approvalHandle), confidenceApprovalProof);
        if (!confidenceApproved) {
            _clearConfidenceApproval(msg.sender);
            emit ExecutionRejected(tokenHash, "recommendation confidence is below the confidential policy threshold", executionRef);
            return false;
        }

        POLICY_VAULT.noteExecution(spendAmountUsd);
        lastExecutionAt = block.timestamp;
        _clearConfidenceApproval(msg.sender);
        emit ExecutionApproved(tokenHash, spendAmountUsd, executionRef);
        return true;
    }

    function settleSessionAssets(
        address[] calldata tokensToSweep,
        uint256 returnedAmountUsd,
        bytes32 settlementRef
    ) external onlyAuthorizedOperator {
        address vaultOwner = POLICY_VAULT.owner();
        _sweepToken(sessionAsset, vaultOwner);

        uint256 length = tokensToSweep.length;
        for (uint256 i = 0; i < length; i++) {
            address token = tokensToSweep[i];
            if (token == address(0) || token == sessionAsset) {
                continue;
            }
            _sweepToken(token, vaultOwner);
        }

        POLICY_VAULT.settleSession(returnedAmountUsd);
        lastSettlementAt = block.timestamp;
        emit SettlementRecorded(returnedAmountUsd, settlementRef);
        emit SessionAssetsSettled(returnedAmountUsd, settlementRef);
    }

    function recordSettlement(uint256 returnedAmountUsd, bytes32 settlementRef) external onlyAuthorizedOperator {
        POLICY_VAULT.settleSession(returnedAmountUsd);
        lastSettlementAt = block.timestamp;
        emit SettlementRecorded(returnedAmountUsd, settlementRef);
    }

    function _sweepToken(address token, address recipient) internal {
        uint256 balance = IERC20Like(token).balanceOf(address(this));
        if (balance == 0) {
            return;
        }
        _safeTransfer(token, recipient, balance);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Like.transferFrom.selector, from, to, amount));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert AssetTransferFailed();
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Like.transfer.selector, to, amount));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert AssetTransferFailed();
        }
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Like.approve.selector, spender, amount));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert AssetApprovalFailed();
        }
    }

    function _clearConfidenceApproval(address operator) internal {
        delete pendingConfidenceApprovalHandles[operator];
        delete pendingConfidenceObserved[operator];
        delete pendingConfidencePolicyUpdatedAt[operator];
        delete pendingConfidenceSessionStartedAt[operator];
    }

    /*
        PolicyVault now validates the confidential daily budget and confidential
        min-confidence threshold through Nox.fromExternal() before the live demo
        can save policy state. This guard prepares a publicly decryptable
        approval handle from the confidential min-confidence comparison, then
        verifies the gateway-issued decryption proof during execution. That
        keeps the threshold itself off the live execution calldata while still
        staying within the officially supported Nox proof model.
    */
}
