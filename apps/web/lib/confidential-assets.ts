import { isAddress, type Address } from "viem";
import { SUPPORTED_CHAIN_ID } from "./contracts";
import { type LiveTokenConfig, getTokenConfig } from "./dex";
import { publicEnv } from "./env";

export type ConfidentialWrapperSupport = {
  supported: boolean;
  reason: string | null;
  wrapperAddress: Address | null;
  token: LiveTokenConfig | null;
};

function readWrapperAddress(symbol: string): string | undefined {
  switch (symbol.trim().toUpperCase()) {
    case "ETH":
      return publicEnv.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS;
    case "ARB":
      return publicEnv.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS;
    case "LINK":
      return publicEnv.NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS;
    default:
      return undefined;
  }
}

export function maybeGetConfidentialWrapperAddress(symbol: string): Address | null {
  const value = readWrapperAddress(symbol);
  if (!value || !isAddress(value)) {
    return null;
  }
  return value;
}

export function getConfidentialWrapperAddress(symbol: string): Address {
  const wrapper = maybeGetConfidentialWrapperAddress(symbol);
  if (!wrapper) {
    throw new Error(`No confidential wrapper is configured for ${symbol}.`);
  }
  return wrapper;
}

export function getConfidentialWrapperSupport(
  symbol: string,
  chainId: number | null | undefined = SUPPORTED_CHAIN_ID
): ConfidentialWrapperSupport {
  if (chainId !== SUPPORTED_CHAIN_ID) {
    return {
      supported: false,
      reason: "Confidential wrapping is Arbitrum Sepolia Testnet only in v1.",
      wrapperAddress: null,
      token: null
    };
  }

  let token: LiveTokenConfig | null = null;
  try {
    token = getTokenConfig(symbol);
  } catch {
    return {
      supported: false,
      reason: `No live token execution config exists for ${symbol}.`,
      wrapperAddress: null,
      token: null
    };
  }

  const wrapperAddress = maybeGetConfidentialWrapperAddress(token.symbol);
  if (!wrapperAddress) {
    return {
      supported: false,
      reason: `No confidential wrapper is configured for ${token.symbol}.`,
      wrapperAddress: null,
      token
    };
  }

  return {
    supported: true,
    reason: null,
    wrapperAddress,
    token
  };
}
