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
  market_price_usd: z.number().optional(),
  price_change_pct_24h: z.number().optional(),
  volume_24h_usd: z.number().optional(),
  market_cap_rank: z.number().nullable().optional(),
  market_source: z.string().optional(),
  market_observed_at: z.string().optional()
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const ResearchRankRequestSchema = z.object({
  whitelist: z.array(z.string()).min(1),
  portfolio_bias: z.enum(["neutral", "defensive", "aggressive"]).default("neutral")
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
  operator_note: z.string()
});
export type ResearchExplainResponse = z.infer<typeof ResearchExplainResponseSchema>;

export const TokenSignalsSchema = z.object({
  symbol: z.string(),
  momentum_signal: z.number(),
  sentiment_signal: z.number(),
  liquidity_signal: z.number(),
  volatility_signal: z.number(),
  market_note: z.string(),
  market_price_usd: z.number().optional(),
  price_change_pct_24h: z.number().optional(),
  volume_24h_usd: z.number().optional(),
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
