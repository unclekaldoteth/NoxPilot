import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_MODE: z.enum(["mock", "live"]).default("live"),
  NEXT_PUBLIC_ENABLE_DEV_MOCKS: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_AGENT_BASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_AGENT_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_POLICY_VAULT_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_CONTRACT_START_BLOCK: z.coerce.number().optional(),
  NEXT_PUBLIC_DEX_ROUTER_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_DEX_QUOTER_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_DEX_DEFAULT_POOL_FEE: z.coerce.number().default(3000),
  NEXT_PUBLIC_SESSION_ASSET_SYMBOL: z.string().default("USDC"),
  NEXT_PUBLIC_SESSION_ASSET_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_TOKEN_ETH_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_TOKEN_ARB_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_TOKEN_LINK_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS: z.string().optional().or(z.literal(""))
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE ?? "live",
  NEXT_PUBLIC_ENABLE_DEV_MOCKS: process.env.NEXT_PUBLIC_ENABLE_DEV_MOCKS ?? "false",
  NEXT_PUBLIC_AGENT_BASE_URL: process.env.NEXT_PUBLIC_AGENT_BASE_URL ?? process.env.NEXT_PUBLIC_AGENT_URL ?? "",
  NEXT_PUBLIC_AGENT_URL: process.env.NEXT_PUBLIC_AGENT_URL ?? "",
  NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ?? "",
  NEXT_PUBLIC_POLICY_VAULT_ADDRESS: process.env.NEXT_PUBLIC_POLICY_VAULT_ADDRESS ?? "",
  NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS: process.env.NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS ?? "",
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS:
    process.env.NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS ??
    process.env.NEXT_PUBLIC_POLICY_VAULT_ADDRESS ??
    "",
  NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL: process.env.NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL ?? "",
  NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS ?? "",
  NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL: process.env.NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL ?? "",
  NEXT_PUBLIC_CONTRACT_START_BLOCK: process.env.NEXT_PUBLIC_CONTRACT_START_BLOCK ?? undefined,
  NEXT_PUBLIC_DEX_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS ?? "",
  NEXT_PUBLIC_DEX_QUOTER_ADDRESS: process.env.NEXT_PUBLIC_DEX_QUOTER_ADDRESS ?? "",
  NEXT_PUBLIC_DEX_DEFAULT_POOL_FEE: process.env.NEXT_PUBLIC_DEX_DEFAULT_POOL_FEE ?? 3000,
  NEXT_PUBLIC_SESSION_ASSET_SYMBOL: process.env.NEXT_PUBLIC_SESSION_ASSET_SYMBOL ?? "USDC",
  NEXT_PUBLIC_SESSION_ASSET_ADDRESS:
    process.env.NEXT_PUBLIC_SESSION_ASSET_ADDRESS ?? process.env.NEXT_PUBLIC_TOKEN_USDC_ADDRESS ?? "",
  NEXT_PUBLIC_TOKEN_ETH_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_ETH_ADDRESS ?? "",
  NEXT_PUBLIC_TOKEN_ARB_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_ARB_ADDRESS ?? "",
  NEXT_PUBLIC_TOKEN_LINK_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_LINK_ADDRESS ?? "",
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS: process.env.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS ?? "",
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS: process.env.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS ?? "",
  NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS: process.env.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS ?? ""
});

export const devMocksEnabled = publicEnv.NEXT_PUBLIC_ENABLE_DEV_MOCKS === "true";

export const liveConfigReady = Boolean(
  publicEnv.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL &&
    publicEnv.NEXT_PUBLIC_POLICY_VAULT_ADDRESS &&
    publicEnv.NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS &&
    publicEnv.NEXT_PUBLIC_DEX_ROUTER_ADDRESS &&
    publicEnv.NEXT_PUBLIC_DEX_QUOTER_ADDRESS &&
    publicEnv.NEXT_PUBLIC_SESSION_ASSET_ADDRESS &&
    publicEnv.NEXT_PUBLIC_TOKEN_ETH_ADDRESS &&
    publicEnv.NEXT_PUBLIC_TOKEN_LINK_ADDRESS
);

export const agentBaseUrl = publicEnv.NEXT_PUBLIC_AGENT_BASE_URL || publicEnv.NEXT_PUBLIC_AGENT_URL;

export const noxClientConfigReady = Boolean(publicEnv.NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS);
