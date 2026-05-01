export const APP_NAME = "NoxPilot";
export const DEFAULT_NETWORK = "Arbitrum Sepolia Testnet";
export const DEFAULT_CHAIN_ID = 421614;

export const TRUST_PILLARS = [
  {
    title: "Vault Wallet",
    description: "Primary capital sits outside day-to-day execution."
  },
  {
    title: "Execution Wallet",
    description: "Operational flow is isolated and session-funded."
  },
  {
    title: "Confidential Policy",
    description: "Thresholds can be wrapped as handles instead of plain values."
  },
  {
    title: "Agent Decisioning",
    description: "Research informs execution, but does not control capital."
  }
] as const;

export const DEFAULT_ALLOWED_TOKENS = ["ETH", "ARB", "USDC", "LINK"];
export const DEFAULT_PROTOCOL = "NoxPilot ExecutionGuard Session";
