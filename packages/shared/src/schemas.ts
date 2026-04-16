import { z } from "zod";

export const AppModeSchema = z.enum(["mock", "live"]);
export type AppMode = z.infer<typeof AppModeSchema>;

export const VaultStateSchema = z.object({
  walletAddress: z.string(),
  chainId: z.number(),
  networkLabel: z.string(),
  nativeBalanceEth: z.number().nullable(),
  nativeBalanceUsd: z.number().nullable(),
  totalBalanceUsd: z.number(),
  allocatedSessionUsd: z.number(),
  availableBalanceUsd: z.number(),
  status: z.enum(["idle", "ready", "active", "paused"])
});
export type VaultState = z.infer<typeof VaultStateSchema>;

export const ExecutionWalletStateSchema = z.object({
  walletAddress: z.string(),
  nativeBalanceEth: z.number().nullable(),
  nativeBalanceUsd: z.number().nullable(),
  dailyBudgetUsd: z.number(),
  remainingBudgetUsd: z.number(),
  sessionActive: z.boolean(),
  sessionEndsAt: z.string().nullable(),
  tradesUsedToday: z.number(),
  tradeLimit: z.number(),
  status: z.enum(["idle", "funded", "executed", "settled", "paused"])
});
export type ExecutionWalletState = z.infer<typeof ExecutionWalletStateSchema>;

export const PrivatePolicyInputSchema = z.object({
  dailyBudgetUsd: z.number().min(50).max(50000),
  minConfidenceScore: z.number().min(50).max(99),
  maxSlippageBps: z.number().min(5).max(500),
  allowedTokens: z.array(z.string()).min(1),
  allowedProtocol: z.string().min(2),
  oneTradePerDay: z.boolean(),
  sessionExpiryHours: z.number().min(1).max(24),
  autoExecuteEnabled: z.boolean()
});
export type PrivatePolicyInput = z.infer<typeof PrivatePolicyInputSchema>;

export const EncryptedFieldSchema = z.object({
  field: z.string(),
  handle: z.string(),
  proof: z.string().optional(),
  preview: z.string(),
  mode: AppModeSchema
});
export type EncryptedField = z.infer<typeof EncryptedFieldSchema>;

export const EncryptedPolicyPayloadSchema = z.object({
  policyId: z.string(),
  encryptedAt: z.string(),
  network: z.string(),
  handleVersion: z.string(),
  publicSummary: z.object({
    allowedTokens: z.array(z.string()),
    allowedProtocol: z.string(),
    oneTradePerDay: z.boolean(),
    sessionExpiryHours: z.number(),
    autoExecuteEnabled: z.boolean()
  }),
  encryptedFields: z.array(EncryptedFieldSchema)
});
export type EncryptedPolicyPayload = z.infer<typeof EncryptedPolicyPayloadSchema>;

export const TokenDiscoveryCategorySchema = z.enum(["meme", "defi", "ai", "gaming", "rwa", "trending"]);
export type TokenDiscoveryCategory = z.infer<typeof TokenDiscoveryCategorySchema>;

export const TokenDiscoveryChainSchema = z.enum(["base", "bsc", "solana"]);
export type TokenDiscoveryChain = z.infer<typeof TokenDiscoveryChainSchema>;

export const TokenExecutionStatusSchema = z.enum(["executable", "needs_allowlist", "research_only", "unsupported_chain"]);
export type TokenExecutionStatus = z.infer<typeof TokenExecutionStatusSchema>;

export const TokenDiscoveryCandidateSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  chain_id: z.string(),
  chain_label: z.string(),
  chain_type: z.enum(["evm", "solana"]),
  token_address: z.string(),
  pair_address: z.string().nullable().optional(),
  dex_id: z.string().nullable().optional(),
  dex_url: z.string().nullable().optional(),
  category: TokenDiscoveryCategorySchema,
  price_usd: z.number().nullable().optional(),
  price_change_pct_24h: z.number().nullable().optional(),
  volume_24h_usd: z.number().nullable().optional(),
  liquidity_usd: z.number().nullable().optional(),
  market_cap_usd: z.number().nullable().optional(),
  fdv_usd: z.number().nullable().optional(),
  pair_created_at: z.string().nullable().optional(),
  quote_token_symbol: z.string().nullable().optional(),
  txns_24h: z.number().optional(),
  execution_status: TokenExecutionStatusSchema,
  execution_note: z.string().nullable().optional(),
  risk_flags: z.array(z.string()).default([])
});
export type TokenDiscoveryCandidate = z.infer<typeof TokenDiscoveryCandidateSchema>;

export const RecommendationSchema = z.object({
  symbol: z.string(),
  score: z.number(),
  confidence: z.number(),
  momentum_signal: z.number(),
  sentiment_signal: z.number(),
  liquidity_signal: z.number(),
  volatility_signal: z.number().optional(),
  risk_note: z.string(),
  thesis: z.string(),
  expected_move_pct: z.number(),
  market_price_usd: z.number().nullable().optional(),
  price_change_pct_24h: z.number().nullable().optional(),
  volume_24h_usd: z.number().nullable().optional(),
  market_cap_rank: z.number().nullable().optional(),
  market_source: z.string().nullable().optional(),
  market_observed_at: z.string().nullable().optional(),
  chain_id: z.string().nullable().optional(),
  chain_label: z.string().nullable().optional(),
  chain_type: z.enum(["evm", "solana"]).nullable().optional(),
  token_address: z.string().nullable().optional(),
  pair_address: z.string().nullable().optional(),
  dex_id: z.string().nullable().optional(),
  dex_url: z.string().nullable().optional(),
  category: TokenDiscoveryCategorySchema.nullable().optional(),
  liquidity_usd: z.number().nullable().optional(),
  execution_status: TokenExecutionStatusSchema.nullable().optional(),
  execution_note: z.string().nullable().optional(),
  risk_flags: z.array(z.string()).nullable().optional()
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const ResearchRankRequestSchema = z.object({
  whitelist: z.array(z.string()).min(1),
  portfolio_bias: z.enum(["neutral", "defensive", "aggressive"]).default("neutral"),
  candidates: z.array(TokenDiscoveryCandidateSchema).optional()
});
export type ResearchRankRequest = z.infer<typeof ResearchRankRequestSchema>;

export const ResearchRankResponseSchema = z.object({
  generatedAt: z.string(),
  candidates: z.array(RecommendationSchema),
  bestCandidate: RecommendationSchema
});
export type ResearchRankResponse = z.infer<typeof ResearchRankResponseSchema>;

export const ResearchExplainRequestSchema = z.object({
  recommendation: RecommendationSchema,
  min_confidence: z.number().optional(),
  allowed_protocol: z.string().optional()
});
export type ResearchExplainRequest = z.infer<typeof ResearchExplainRequestSchema>;

export const ResearchExplainResponseSchema = z.object({
  summary: z.string(),
  checks: z.array(z.string()),
  operator_note: z.string(),
  provider: z.string().optional(),
  model: z.string().nullable().optional()
});
export type ResearchExplainResponse = z.infer<typeof ResearchExplainResponseSchema>;

export const TokenSignalsSchema = z.object({
  symbol: z.string(),
  momentum_signal: z.number(),
  sentiment_signal: z.number(),
  liquidity_signal: z.number(),
  volatility_signal: z.number(),
  market_note: z.string(),
  market_price_usd: z.number().nullable().optional(),
  price_change_pct_24h: z.number().nullable().optional(),
  volume_24h_usd: z.number().nullable().optional(),
  market_cap_rank: z.number().nullable().optional(),
  market_source: z.string().optional(),
  market_observed_at: z.string().optional()
});
export type TokenSignals = z.infer<typeof TokenSignalsSchema>;

export const ResearchMockMarketRequestSchema = z.object({
  whitelist: z.array(z.string()).default(["ETH", "ARB", "USDC", "LINK"])
});
export type ResearchMockMarketRequest = z.infer<typeof ResearchMockMarketRequestSchema>;

export const ResearchMockMarketResponseSchema = z.object({
  generatedAt: z.string(),
  signals: z.array(TokenSignalsSchema)
});
export type ResearchMockMarketResponse = z.infer<typeof ResearchMockMarketResponseSchema>;

export const TokenDiscoveryRequestSchema = z.object({
  category: TokenDiscoveryCategorySchema.default("meme"),
  chains: z.array(TokenDiscoveryChainSchema).min(1).default(["base", "bsc", "solana"]),
  limit: z.number().min(1).max(24).default(9),
  min_liquidity_usd: z.number().min(0).default(10000),
  min_volume_24h_usd: z.number().min(0).default(1000),
  risk_mode: z.enum(["conservative", "balanced", "aggressive"]).default("balanced")
});
export type TokenDiscoveryRequest = z.infer<typeof TokenDiscoveryRequestSchema>;

export const TokenDiscoveryResponseSchema = z.object({
  generatedAt: z.string(),
  source: z.string(),
  category: TokenDiscoveryCategorySchema,
  chains: z.array(TokenDiscoveryChainSchema),
  candidates: z.array(TokenDiscoveryCandidateSchema)
});
export type TokenDiscoveryResponse = z.infer<typeof TokenDiscoveryResponseSchema>;

export const ExecutionDecisionSchema = z.object({
  allowed: z.boolean(),
  action: z.enum(["wait", "fund", "execute", "settle", "blocked"]),
  token: z.string().nullable(),
  reasons: z.array(z.string()),
  requiredFundingUsd: z.number(),
  estimatedSpendUsd: z.number(),
  mode: AppModeSchema
});
export type ExecutionDecision = z.infer<typeof ExecutionDecisionSchema>;

export const ActivityItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.enum(["operator", "research-agent", "execution-layer", "system"]),
  title: z.string(),
  detail: z.string(),
  status: z.enum(["info", "success", "warning", "error"])
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const SettlementResultSchema = z.object({
  amountReturnedUsd: z.number(),
  pnlUsd: z.number(),
  sessionClosed: z.boolean(),
  txRef: z.string(),
  summary: z.string()
});
export type SettlementResult = z.infer<typeof SettlementResultSchema>;
