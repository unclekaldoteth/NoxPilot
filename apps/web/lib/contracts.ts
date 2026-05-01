import {
  DEFAULT_ALLOWED_TOKENS,
  DEFAULT_CHAIN_ID,
  DEFAULT_NETWORK,
  type EncryptedField,
  type EncryptedPolicyPayload,
  type PrivatePolicyInput
} from "@noxpilot/shared";
import {
  formatEther,
  isAddress,
  keccak256,
  parseAbi,
  toHex,
  zeroHash,
  type Address,
  type Hex
} from "viem";
import { publicEnv } from "./env";
import { getConfiguredDemoTokens } from "./dex";

export const policyVaultAbi = parseAbi([
  "function owner() view returns (address)",
  "function executionWallet() view returns (address)",
  "function executionController() view returns (address)",
  "function paused() view returns (bool)",
  "function confidentialDailyBudgetInitialized() view returns (bool)",
  "function confidentialMinConfidenceInitialized() view returns (bool)",
  "function confidentialDailyBudgetHandle() view returns (bytes32)",
  "function confidentialMinConfidenceHandle() view returns (bytes32)",
  "function remainingSessionBudget() view returns (uint256)",
  "function policyUpdatedAt() view returns (uint64)",
  "function policyRefs() view returns (bytes32 dailyBudgetHandle, bytes32 minConfidenceHandle, bytes32 maxSlippageHandle, bytes32 autoExecuteHandle, bytes32 whitelistRoot, string allowedProtocol, string metadataUri, uint64 updatedAt)",
  "function sessionSnapshot() view returns (bool active, uint64 startedAt, uint64 expiresAt, uint32 tradesUsed, uint32 tradeLimit, uint256 fundedAmountUsd, uint256 spentAmountUsd, uint256 settledAmountUsd)",
  "function registerExecutionWallet(address newExecutionWallet)",
  "function registerExecutionController(address newController)",
  "function updatePolicy(bytes32 dailyBudgetHandle, bytes32 minConfidenceHandle, bytes32 maxSlippageHandle, bytes32 autoExecuteHandle, bytes32 whitelistRoot, string allowedProtocol, string metadataUri)",
  "function updatePolicyWithNox(bytes32 dailyBudgetExternalHandle, bytes dailyBudgetProof, bytes32 minConfidenceExternalHandle, bytes minConfidenceProof, bytes32 maxSlippageHandle, bytes32 autoExecuteHandle, bytes32 whitelistRoot, string allowedProtocol, string metadataUri)",
  "function setPaused(bool isPaused)",
  "function openSession(uint256 fundedAmountUsd, uint32 tradeLimit, uint64 expiryHours)"
]);

export const executionGuardAbi = parseAbi([
  "function admin() view returns (address)",
  "function registerAdmin(address newAdmin)",
  "function policyVault() view returns (address)",
  "function sessionAsset() view returns (address)",
  "function swapRouter() view returns (address)",
  "function defaultPoolFee() view returns (uint24)",
  "function sessionAssetBalance() view returns (uint256)",
  "function syncedWhitelistRoot() view returns (bytes32)",
  "function lastExecutionAt() view returns (uint256)",
  "function lastSettlementAt() view returns (uint256)",
  "function lastWrapAt() view returns (uint256)",
  "function lastSwapToken() view returns (address)",
  "function lastAmountIn() view returns (uint256)",
  "function lastAmountOut() view returns (uint256)",
  "function lastWrapToken() view returns (address)",
  "function lastWrapWrapper() view returns (address)",
  "function lastWrapAmount() view returns (uint256)",
  "function lastWrapAmountHandle() view returns (bytes32)",
  "function lastWrapBalanceHandle() view returns (bytes32)",
  "function pendingConfidenceApprovalHandles(address) view returns (bytes32)",
  "function pendingConfidenceObserved(address) view returns (uint256)",
  "function allowedTokenHashes(bytes32) view returns (bool)",
  "function allowedTokenAddresses(address) view returns (bool)",
  "function confidentialWrappers(address) view returns (address)",
  "function previewExecution(bytes32 tokenHash, address caller, uint256 spendAmountUsd, uint256 observedConfidence) view returns (bool allowed, string reason)",
  "function syncPolicyWhitelistRoot() returns (bytes32 whitelistRoot)",
  "function setAllowedToken(bytes32 tokenHash, bool allowed)",
  "function setAllowedTokenAddress(address tokenAddress, bool allowed)",
  "function setConfidentialWrapper(address tokenAddress, address wrapper, bool allowed)",
  "function fundSessionAsset(uint256 amount, bytes32 fundingRef)",
  "function prepareConfidenceApproval(uint256 observedConfidence) returns (bytes32 approvalHandle)",
  "function executeExactInputSingle(bytes32 tokenHash, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum, uint256 spendAmountUsd, uint256 observedConfidence, bytes confidenceApprovalProof, bytes32 executionRef) returns (uint256 amountOut)",
  "function wrapLastOutput(address tokenOut, uint256 amount, bytes32 wrapRef) returns (bytes32 amountHandle, bytes32 balanceHandle)",
  "function settleSessionAssets(address[] tokensToSweep, uint256 returnedAmountUsd, bytes32 settlementRef)",
  "function recordExecution(bytes32 tokenHash, uint256 spendAmountUsd, uint256 observedConfidence, bytes confidenceApprovalProof, bytes32 executionRef) returns (bool)",
  "function recordSettlement(uint256 returnedAmountUsd, bytes32 settlementRef)"
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
]);

export const quoterV2Abi = parseAbi([
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)"
]);

export const confidentialWrapperAbi = parseAbi([
  "function underlying() view returns (address)",
  "function confidentialBalanceHandleOf(address account) view returns (bytes32)",
  "function confidentialTotalSupplyHandle() view returns (bytes32)",
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function unwrap(address from, address to, bytes32 amount) returns (bytes32 unwrapRequestId)",
  "function finalizeUnwrap(bytes32 unwrapRequestId, bytes decryptedAmountAndProof)"
]);

export type PolicyRefs = {
  dailyBudgetHandle: Hex;
  minConfidenceHandle: Hex;
  maxSlippageHandle: Hex;
  autoExecuteHandle: Hex;
  whitelistRoot: Hex;
  allowedProtocol: string;
  metadataUri: string;
  updatedAt: bigint;
};

export type SessionSnapshot = {
  active: boolean;
  startedAt: bigint;
  expiresAt: bigint;
  tradesUsed: number;
  tradeLimit: number;
  fundedAmountUsd: bigint;
  spentAmountUsd: bigint;
  settledAmountUsd: bigint;
};

export type GuardWrapSnapshot = {
  lastWrapAt: bigint;
  lastWrapToken: Address;
  lastWrapWrapper: Address;
  lastWrapAmount: bigint;
  lastWrapAmountHandle: Hex;
  lastWrapBalanceHandle: Hex;
};

export type PolicyMetadata = {
  policyId: string;
  allowedTokens: string[];
  oneTradePerDay: boolean;
  sessionExpiryHours: number;
  autoExecuteEnabled: boolean;
};

export function getPolicyVaultAddress(): Address {
  const candidate = publicEnv.NEXT_PUBLIC_POLICY_VAULT_ADDRESS;
  if (!candidate || !isAddress(candidate)) {
    throw new Error("NEXT_PUBLIC_POLICY_VAULT_ADDRESS is missing or invalid.");
  }
  return candidate;
}

export function getExecutionGuardAddress(): Address {
  const candidate = publicEnv.NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS;
  if (!candidate || !isAddress(candidate)) {
    throw new Error("NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS is missing or invalid.");
  }
  return candidate;
}

export function getNoxApplicationAddress(): Address {
  const candidate = publicEnv.NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS || publicEnv.NEXT_PUBLIC_POLICY_VAULT_ADDRESS;
  if (!candidate || !isAddress(candidate)) {
    throw new Error("NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS is missing or invalid.");
  }
  return candidate;
}

export function normalizeTokenSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function tokenHash(symbol: string): Hex {
  return keccak256(toHex(normalizeTokenSymbol(symbol)));
}

export function computeWhitelistRoot(tokens: string[]): Hex {
  const normalized = [...new Set(tokens.map(normalizeTokenSymbol))].sort();
  return keccak256(toHex(normalized.join("|")));
}

export function createExecutionReference(kind: "execution" | "settlement", tokenOrPolicy: string): Hex {
  return keccak256(toHex(`${kind}:${tokenOrPolicy}:${Date.now().toString(36)}`));
}

export function formatEthBalance(balanceWei: bigint): number {
  return Number.parseFloat(Number(formatEther(balanceWei)).toFixed(6));
}

function encodeBase64(value: string) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(value);
  }
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(value);
  }
  return Buffer.from(value, "base64").toString("utf8");
}

export function encodePolicyMetadata(input: PolicyMetadata): string {
  return `json:${encodeBase64(JSON.stringify(input))}`;
}

export function decodePolicyMetadata(metadataUri: string): PolicyMetadata | null {
  if (!metadataUri.startsWith("json:")) {
    return null;
  }

  try {
    const decoded = JSON.parse(decodeBase64(metadataUri.slice("json:".length))) as PolicyMetadata;
    return {
      ...decoded,
      allowedTokens: decoded.allowedTokens.map(normalizeTokenSymbol)
    };
  } catch {
    return null;
  }
}

export function isPolicyStored(policyRefs: PolicyRefs) {
  return policyRefs.updatedAt > 0n && policyRefs.dailyBudgetHandle !== zeroHash;
}

export function buildEncryptedPolicyFromChain(policyRefs: PolicyRefs): EncryptedPolicyPayload | null {
  if (!isPolicyStored(policyRefs)) {
    return null;
  }

  const metadata = decodePolicyMetadata(policyRefs.metadataUri);
  const fields: EncryptedField[] = [
    {
      field: "dailyBudgetUsd",
      handle: policyRefs.dailyBudgetHandle,
      preview: "Loaded from PolicyVault handle reference",
      mode: "live"
    },
    {
      field: "minConfidenceScore",
      handle: policyRefs.minConfidenceHandle,
      preview: "Loaded from PolicyVault handle reference",
      mode: "live"
    },
    {
      field: "maxSlippageBps",
      handle: policyRefs.maxSlippageHandle,
      preview: "Loaded from PolicyVault handle reference",
      mode: "live"
    },
    {
      field: "autoExecuteEnabled",
      handle: policyRefs.autoExecuteHandle,
      preview: "Loaded from PolicyVault handle reference",
      mode: "live"
    }
  ];

  return {
    policyId: metadata?.policyId ?? `chain-${policyRefs.updatedAt.toString()}`,
    encryptedAt: new Date(Number(policyRefs.updatedAt) * 1000).toISOString(),
    network: DEFAULT_NETWORK,
    handleVersion: "nox-live-v1",
    publicSummary: {
      allowedTokens: metadata?.allowedTokens ?? getConfiguredDemoTokens().map((token) => token.symbol),
      allowedProtocol: policyRefs.allowedProtocol,
      oneTradePerDay: metadata?.oneTradePerDay ?? true,
      sessionExpiryHours: metadata?.sessionExpiryHours ?? 8,
      autoExecuteEnabled: metadata?.autoExecuteEnabled ?? false
    },
    encryptedFields: fields
  };
}

export function buildDefaultPolicyInput(): PrivatePolicyInput {
  const configuredTokens = getConfiguredDemoTokens().map((token) => token.symbol);
  return {
    dailyBudgetUsd: 1500,
    minConfidenceScore: 78,
    maxSlippageBps: 45,
    allowedTokens: configuredTokens.length > 0 ? configuredTokens : DEFAULT_ALLOWED_TOKENS.slice(),
    allowedProtocol: "NoxPilot ExecutionGuard Session",
    oneTradePerDay: true,
    sessionExpiryHours: 8,
    autoExecuteEnabled: false
  };
}

export function toPolicyRefs(tuple: readonly [Hex, Hex, Hex, Hex, Hex, string, string, bigint]): PolicyRefs {
  return {
    dailyBudgetHandle: tuple[0],
    minConfidenceHandle: tuple[1],
    maxSlippageHandle: tuple[2],
    autoExecuteHandle: tuple[3],
    whitelistRoot: tuple[4],
    allowedProtocol: tuple[5],
    metadataUri: tuple[6],
    updatedAt: tuple[7]
  };
}

export function toSessionSnapshot(
  tuple: readonly [boolean, bigint, bigint, number, number, bigint, bigint, bigint]
): SessionSnapshot {
  return {
    active: tuple[0],
    startedAt: tuple[1],
    expiresAt: tuple[2],
    tradesUsed: Number(tuple[3]),
    tradeLimit: Number(tuple[4]),
    fundedAmountUsd: tuple[5],
    spentAmountUsd: tuple[6],
    settledAmountUsd: tuple[7]
  };
}

export function describeWriteAction(txHash: Hex, verb: string) {
  return `${verb} confirmed on Arbitrum Sepolia Testnet. Tx: ${txHash}`;
}

export const SUPPORTED_CHAIN_ID = DEFAULT_CHAIN_ID;
