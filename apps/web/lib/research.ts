import {
  ResearchMockMarketResponseSchema,
  ResearchExplainResponseSchema,
  ResearchRankResponseSchema,
  type Recommendation,
  type ResearchMockMarketResponse,
  type ResearchExplainResponse,
  type ResearchRankResponse
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
  portfolioBias: "neutral" | "defensive" | "aggressive"
): Promise<ResearchFetchResult<ResearchRankResponse>> {
  const response = await fetch("/api/research/rank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ whitelist, portfolio_bias: portfolioBias })
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    data: ResearchRankResponseSchema.parse(await response.json()),
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
  const response = await fetch("/api/research/mock-market", {
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
