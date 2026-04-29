import {
  DEFAULT_ALLOWED_TOKENS,
  DEFAULT_CHAIN_ID,
  DEFAULT_NETWORK,
  DEFAULT_PROTOCOL
} from "./constants";
import type {
  ActivityItem,
  ConfidentialPosition,
  EncryptedPolicyPayload,
  ExecutionWalletState,
  PrivatePolicyInput,
  Recommendation,
  VaultState
} from "./schemas";

export const demoVaultState: VaultState = {
  walletAddress: "0xA11ce0000000000000000000000000000000Vault",
  chainId: DEFAULT_CHAIN_ID,
  networkLabel: DEFAULT_NETWORK,
  nativeBalanceEth: 0.0,
  nativeBalanceUsd: 0.0,
  totalBalanceUsd: 248500,
  allocatedSessionUsd: 0,
  availableBalanceUsd: 248500,
  status: "ready"
};

export const demoExecutionState: ExecutionWalletState = {
  walletAddress: "0xB0b0000000000000000000000000000000Exec01",
  nativeBalanceEth: 0.0,
  nativeBalanceUsd: 0.0,
  sessionAssetSymbol: "USDC",
  sessionAssetBalance: 1500,
  sessionAssetAllowance: 1500,
  dailyBudgetUsd: 1500,
  remainingBudgetUsd: 0,
  sessionActive: false,
  sessionEndsAt: null,
  tradesUsedToday: 0,
  tradeLimit: 1,
  status: "idle"
};

export const defaultPolicyInput: PrivatePolicyInput = {
  dailyBudgetUsd: 1500,
  minConfidenceScore: 78,
  maxSlippageBps: 45,
  allowedTokens: [...DEFAULT_ALLOWED_TOKENS],
  allowedProtocol: DEFAULT_PROTOCOL,
  oneTradePerDay: true,
  sessionExpiryHours: 8,
  autoExecuteEnabled: false
};

export const mockRecommendation: Recommendation = {
  symbol: "ARB",
  score: 84,
  confidence: 82,
  momentum_signal: 79,
  sentiment_signal: 75,
  liquidity_signal: 91,
  volatility_signal: 41,
  risk_note: "Momentum is positive but the move remains beta-sensitive to broader L2 rotation.",
  thesis: "ARB screens well for liquid mean-reversion upside with enough depth for a bounded intraday execution.",
  expected_move_pct: 2.8,
  market_price_usd: 2.1,
  price_change_pct_24h: 3.2,
  volume_24h_usd: 225000000,
  market_cap_rank: 36,
  market_source: "dev-mock",
  market_observed_at: "2026-04-15T09:05:00.000Z"
};

export const initialActivity: ActivityItem[] = [
  {
    id: "boot",
    timestamp: "2026-04-15T09:00:00.000Z",
    actor: "system",
    title: "Workspace initialized",
    detail: "Mock-safe mode is active until live Nox and contract config is supplied.",
    status: "info"
  },
  {
    id: "boundary",
    timestamp: "2026-04-15T09:02:00.000Z",
    actor: "system",
    title: "Trust boundary loaded",
    detail: "Vault capital and execution operations are modeled as separate wallets.",
    status: "success"
  }
];

export const sampleEncryptedPolicy: EncryptedPolicyPayload = {
  policyId: "policy-demo-001",
  encryptedAt: "2026-04-15T09:05:00.000Z",
  network: DEFAULT_NETWORK,
  handleVersion: "mock-v1",
  publicSummary: {
    allowedTokens: [...DEFAULT_ALLOWED_TOKENS],
    allowedProtocol: DEFAULT_PROTOCOL,
    oneTradePerDay: true,
    sessionExpiryHours: 8,
    autoExecuteEnabled: false
  },
  encryptedFields: [
    { field: "dailyBudgetUsd", handle: "0xdeadbeef01", preview: "Budget threshold encrypted", mode: "mock" },
    { field: "minConfidenceScore", handle: "0xdeadbeef02", preview: "Confidence threshold encrypted", mode: "mock" },
    { field: "maxSlippageBps", handle: "0xdeadbeef03", preview: "Slippage threshold encrypted", mode: "mock" }
  ]
};

export const mockConfidentialPosition: ConfidentialPosition = {
  underlyingSymbol: "ARB",
  underlyingAddress: "0xMockArbToken0000000000000000000000000000001",
  wrapperAddress: "0xMockWrapper000000000000000000000000000001",
  chainId: DEFAULT_CHAIN_ID,
  publicAmount: "300",
  encryptedAmountHandle: "0xdeadbeef04",
  encryptedBalanceHandle: "0xdeadbeef05",
  wrapTxHash: "0xmock-wrap",
  unwrapRequestHandle: null,
  unwrapTxHash: null,
  finalizeUnwrapTxHash: null,
  viewerAclState: {
    isPublic: false,
    admins: [demoVaultState.walletAddress],
    viewers: [demoVaultState.walletAddress],
    canDecrypt: true,
    checkedAt: "2026-04-15T09:07:00.000Z"
  },
  decryptedBalance: "300",
  revealError: null,
  status: "revealed"
};
