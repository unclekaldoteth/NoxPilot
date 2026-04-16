import { DEFAULT_ALLOWED_TOKENS } from "@noxpilot/shared";
import { formatUnits, isAddress, parseUnits, type Address } from "viem";
import { publicEnv } from "./env";

type SupportedTokenSymbol = "ETH" | "ARB" | "LINK" | "USDC";

export type LiveTokenConfig = {
  symbol: SupportedTokenSymbol;
  address: Address;
  decimals: number;
  poolFee: number;
};

const TOKEN_DECIMALS: Record<SupportedTokenSymbol, number> = {
  ETH: 18,
  ARB: 18,
  LINK: 18,
  USDC: 6
};

function normalizeSymbol(symbol: string): SupportedTokenSymbol {
  const normalized = symbol.trim().toUpperCase();
  if (normalized === "ETH" || normalized === "ARB" || normalized === "LINK" || normalized === "USDC") {
    return normalized;
  }

  throw new Error(`Unsupported live token symbol: ${symbol}`);
}

function readTokenAddress(symbol: SupportedTokenSymbol): Address {
  const value =
    symbol === "ETH"
      ? publicEnv.NEXT_PUBLIC_TOKEN_ETH_ADDRESS
      : symbol === "ARB"
        ? publicEnv.NEXT_PUBLIC_TOKEN_ARB_ADDRESS
        : symbol === "LINK"
          ? publicEnv.NEXT_PUBLIC_TOKEN_LINK_ADDRESS
          : publicEnv.NEXT_PUBLIC_SESSION_ASSET_ADDRESS;

  if (!value || !isAddress(value)) {
    throw new Error(`Missing or invalid configured address for ${symbol}.`);
  }

  return value;
}

function maybeReadTokenAddress(symbol: SupportedTokenSymbol): Address | null {
  const value =
    symbol === "ETH"
      ? publicEnv.NEXT_PUBLIC_TOKEN_ETH_ADDRESS
      : symbol === "ARB"
        ? publicEnv.NEXT_PUBLIC_TOKEN_ARB_ADDRESS
        : symbol === "LINK"
          ? publicEnv.NEXT_PUBLIC_TOKEN_LINK_ADDRESS
          : publicEnv.NEXT_PUBLIC_SESSION_ASSET_ADDRESS;

  if (!value || !isAddress(value)) {
    return null;
  }

  return value;
}

export function getDexRouterAddress(): Address {
  const value = publicEnv.NEXT_PUBLIC_DEX_ROUTER_ADDRESS;
  if (!value || !isAddress(value)) {
    throw new Error("NEXT_PUBLIC_DEX_ROUTER_ADDRESS is missing or invalid.");
  }
  return value;
}

export function getDexQuoterAddress(): Address {
  const value = publicEnv.NEXT_PUBLIC_DEX_QUOTER_ADDRESS;
  if (!value || !isAddress(value)) {
    throw new Error("NEXT_PUBLIC_DEX_QUOTER_ADDRESS is missing or invalid.");
  }
  return value;
}

export function getDefaultPoolFee() {
  return publicEnv.NEXT_PUBLIC_DEX_DEFAULT_POOL_FEE;
}

export function getSessionAssetConfig(): LiveTokenConfig {
  const sessionSymbol = normalizeSymbol(publicEnv.NEXT_PUBLIC_SESSION_ASSET_SYMBOL);
  if (sessionSymbol !== "USDC") {
    throw new Error("This MVP expects NEXT_PUBLIC_SESSION_ASSET_SYMBOL=USDC for budget-denominated live sessions.");
  }

  return {
    symbol: sessionSymbol,
    address: readTokenAddress(sessionSymbol),
    decimals: TOKEN_DECIMALS[sessionSymbol],
    poolFee: getDefaultPoolFee()
  };
}

export function getTokenConfig(symbol: string): LiveTokenConfig {
  const normalized = normalizeSymbol(symbol);
  return {
    symbol: normalized,
    address: readTokenAddress(normalized),
    decimals: TOKEN_DECIMALS[normalized],
    poolFee: getDefaultPoolFee()
  };
}

export function getConfiguredDemoTokens(): LiveTokenConfig[] {
  return DEFAULT_ALLOWED_TOKENS.flatMap((symbol) => {
    const normalized = normalizeSymbol(symbol);
    const address = maybeReadTokenAddress(normalized);
    if (!address) {
      return [];
    }

    return [
      {
        symbol: normalized,
        address,
        decimals: TOKEN_DECIMALS[normalized],
        poolFee: getDefaultPoolFee()
      }
    ];
  });
}

export function maybeGetTokenConfigByAddress(address: string): LiveTokenConfig | null {
  const normalizedAddress = address.toLowerCase();
  return (
    getConfiguredDemoTokens().find((token) => token.address.toLowerCase() === normalizedAddress) ?? null
  );
}

export function usdToSessionAssetUnits(amountUsd: number): bigint {
  const sessionAsset = getSessionAssetConfig();
  return parseUnits(amountUsd.toFixed(0), sessionAsset.decimals);
}

export function tokenUnitsToNumber(amount: bigint, decimals: number): number {
  return Number(formatUnits(amount, decimals));
}
