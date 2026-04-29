import {
  ResearchMockMarketResponseSchema,
  AgentHealthResponseSchema,
  ResearchExplainResponseSchema,
  ResearchRankResponseSchema,
  TokenDiscoveryResponseSchema,
  type Recommendation,
  type AgentHealthResponse,
  type ResearchMockMarketResponse,
  type ResearchExplainResponse,
  type ResearchRankResponse,
  type TokenDiscoveryCandidate,
  type TokenDiscoveryChain,
  type TokenDiscoveryCategory,
  type TokenDiscoveryResponse
} from "@noxpilot/shared";

export type ResearchDeliverySource = "agent" | "mock";

export type ResearchDelivery = {
  source: ResearchDeliverySource;
};

export type ResearchFetchResult<T> = {
  data: T;
  delivery: ResearchDelivery;
};

function extractDelivery(response: Response): ResearchDelivery {
  const sourceHeader = response.headers.get("x-noxpilot-agent-source");
  const source: ResearchDeliverySource = sourceHeader === "mock" ? "mock" : "agent";

  return {
    source
  };
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; detail?: string };
    return payload.error ?? payload.detail ?? "Research agent request failed.";
  } catch {
    return "Research agent request failed.";
  }
}

export async function fetchResearchRanking(
  whitelist: string[],
  portfolioBias: "neutral" | "defensive" | "aggressive",
  candidates?: TokenDiscoveryCandidate[]
): Promise<ResearchFetchResult<ResearchRankResponse>> {
  const response = await fetch("/api/research/rank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ whitelist, portfolio_bias: portfolioBias, candidates })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: ResearchRankResponseSchema.parse(await response.json()),
    delivery: extractDelivery(response)
  };
}

export async function fetchTokenDiscovery(input: {
  category: TokenDiscoveryCategory;
  chains: TokenDiscoveryChain[];
  limit?: number;
  min_liquidity_usd?: number;
  min_volume_24h_usd?: number;
  risk_mode?: "conservative" | "balanced" | "aggressive";
}): Promise<ResearchFetchResult<TokenDiscoveryResponse>> {
  const response = await fetch("/api/research/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: TokenDiscoveryResponseSchema.parse(await response.json()),
    delivery: extractDelivery(response)
  };
}

export async function fetchResearchExplanation(
  recommendation: Recommendation,
  minConfidence?: number,
  allowedProtocol?: string
): Promise<ResearchFetchResult<ResearchExplainResponse>> {
  const response = await fetch("/api/research/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recommendation,
      min_confidence: minConfidence,
      allowed_protocol: allowedProtocol
    })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: ResearchExplainResponseSchema.parse(await response.json()),
    delivery: extractDelivery(response)
  };
}

export async function fetchMarketSnapshot(whitelist: string[]): Promise<ResearchFetchResult<ResearchMockMarketResponse>> {
  const response = await fetch("/api/research/market", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ whitelist })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: ResearchMockMarketResponseSchema.parse(await response.json()),
    delivery: extractDelivery(response)
  };
}

export async function fetchAgentHealth(): Promise<ResearchFetchResult<AgentHealthResponse>> {
  const response = await fetch("/api/research/health", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: AgentHealthResponseSchema.parse(await response.json()),
    delivery: extractDelivery(response)
  };
}
