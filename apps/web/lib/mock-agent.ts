import type {
  Recommendation,
  ResearchRankResponse,
  TokenDiscoveryCandidate,
  TokenDiscoveryRequest,
  TokenDiscoveryResponse
} from "@noxpilot/shared";

function seed(symbol: string, salt: string) {
  return Array.from(`${symbol}:${salt}`).reduce((accumulator, char, index) => {
    return accumulator + char.charCodeAt(0) * (index + 17);
  }, 0);
}

function signal(symbol: string, salt: string, low: number, high: number) {
  const span = high - low;
  return low + (seed(symbol, salt) % (span + 1));
}

export function buildMockRecommendation(symbol: string, portfolioBias: "neutral" | "defensive" | "aggressive") {
  const momentum = signal(symbol, "momentum", 58, 92);
  const sentiment = signal(symbol, "sentiment", 46, 90);
  const liquidity = signal(symbol, "liquidity", 60, 96);
  const volatility = signal(symbol, "volatility", 18, 72);
  const biasOffset = portfolioBias === "aggressive" ? 2.5 : portfolioBias === "defensive" ? -2 : 0;

  const score = momentum * 0.38 + sentiment * 0.24 + liquidity * 0.26 - volatility * 0.12 + biasOffset;
  const confidence = momentum * 0.36 + sentiment * 0.18 + liquidity * 0.3 + (100 - volatility) * 0.16;

  const recommendation: Recommendation = {
    symbol,
    score: Number(score.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    momentum_signal: momentum,
    sentiment_signal: sentiment,
    liquidity_signal: liquidity,
    risk_note:
      volatility > 56
        ? "Volatility remains elevated relative to liquidity, so execution should stay within a tight budget."
        : "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.",
    thesis: `${symbol} screens well for a single bounded session because liquidity is supportive and signal alignment is coherent.`,
    expected_move_pct: Number((((momentum - 50) / 16.5) * 1).toFixed(2))
  };

  return recommendation;
}

export function buildMockRankResponse(
  whitelist: string[],
  portfolioBias: "neutral" | "defensive" | "aggressive" = "neutral",
  candidates?: TokenDiscoveryCandidate[]
): ResearchRankResponse {
  const rankedCandidates = (candidates?.length ? candidates.map((candidate) => candidate.symbol) : whitelist)
    .map((symbol) => {
      const discovered = candidates?.find((candidate) => candidate.symbol === symbol);
      return {
        ...buildMockRecommendation(symbol, portfolioBias),
        chain_id: discovered?.chain_id,
        chain_label: discovered?.chain_label,
        chain_type: discovered?.chain_type,
        token_address: discovered?.token_address,
        pair_address: discovered?.pair_address,
        dex_id: discovered?.dex_id,
        dex_url: discovered?.dex_url,
        category: discovered?.category,
        liquidity_usd: discovered?.liquidity_usd,
        execution_status: discovered?.execution_status,
        execution_note: discovered?.execution_note,
        risk_flags: discovered?.risk_flags,
        market_source: discovered ? "dev-mock discovery" : undefined
      };
    })
    .sort((left, right) => right.score - left.score);

  return {
    generatedAt: new Date().toISOString(),
    candidates: rankedCandidates,
    bestCandidate: rankedCandidates[0]
  };
}

export function buildMockExplainResponse(payload: { recommendation: Recommendation; min_confidence?: number; allowed_protocol?: string }) {
  const checks = [
    `Score ${payload.recommendation.score.toFixed(1)} leads the shortlist.`,
    `Confidence reads ${payload.recommendation.confidence.toFixed(1)} with liquidity at ${payload.recommendation.liquidity_signal.toFixed(1)}.`,
    payload.recommendation.risk_note
  ];

  if (typeof payload.min_confidence === "number") {
    checks.push(
      payload.recommendation.confidence >= payload.min_confidence
        ? `Confidence clears the threshold of ${payload.min_confidence.toFixed(1)}.`
        : `Confidence misses the threshold of ${payload.min_confidence.toFixed(1)}.`
    );
  }

  if (payload.allowed_protocol) {
    checks.push(`Execution remains scoped to ${payload.allowed_protocol}.`);
  }

  return {
    summary: `${payload.recommendation.symbol} is the top candidate because liquidity, momentum, and sentiment align for a short-duration bounded session.`,
    checks,
    operator_note:
      "This is research output only. The execution layer still validates budget, token whitelist, session status, and confidential policy thresholds.",
    provider: "Dev mock explainer",
    model: null
  };
}

export function buildMockMarketSignals(whitelist: string[]) {
  return whitelist.map((symbol) => ({
    symbol,
    momentum_signal: signal(symbol, "momentum", 58, 92),
    sentiment_signal: signal(symbol, "sentiment", 46, 90),
    liquidity_signal: signal(symbol, "liquidity", 60, 96),
    volatility_signal: signal(symbol, "volatility", 18, 72),
    market_note:
      signal(symbol, "volatility", 18, 72) > 56
        ? "Volatility is elevated; tighter execution controls are warranted."
        : "Market structure is stable enough for bounded participation."
  }));
}

export function buildMockDiscoveryResponse(payload: TokenDiscoveryRequest): TokenDiscoveryResponse {
  const chainLabels: Record<string, { label: string; type: "evm" | "solana" }> = {
    base: { label: "Base", type: "evm" },
    bsc: { label: "BNB Chain", type: "evm" },
    solana: { label: "Solana", type: "solana" }
  };
  const names = ["PEPE", "BONK", "TOSHI", "MOG", "WIF", "CAT"];
  const candidates = payload.chains.flatMap((chain, chainIndex) => {
    const meta = chainLabels[chain];
    return names.slice(0, 2).map((symbol, index) => ({
      symbol: `${symbol}${chainIndex}${index}`,
      name: `${symbol} ${meta.label} mock`,
      chain_id: chain,
      chain_label: meta.label,
      chain_type: meta.type,
      token_address: `${chain}-mock-${symbol.toLowerCase()}-${index}`,
      pair_address: `${chain}-pair-${symbol.toLowerCase()}-${index}`,
      dex_id: chain === "solana" ? "raydium" : "uniswap",
      dex_url: "https://dexscreener.com",
      category: payload.category,
      price_usd: Number((0.0001 * (index + 1)).toFixed(8)),
      price_change_pct_24h: signal(symbol, chain, -15, 45),
      volume_24h_usd: signal(symbol, "volume", 10000, 250000),
      liquidity_usd: signal(symbol, "liquidity", 25000, 500000),
      market_cap_usd: signal(symbol, "market-cap", 250000, 5000000),
      fdv_usd: signal(symbol, "fdv", 250000, 8000000),
      pair_created_at: new Date(Date.now() - signal(symbol, "age", 1, 30) * 86400000).toISOString(),
      quote_token_symbol: chain === "solana" ? "SOL" : chain === "bsc" ? "WBNB" : "WETH",
      txns_24h: signal(symbol, "txns", 25, 800),
      execution_status: chain === "solana" ? "research_only" : "needs_allowlist",
      execution_note:
        chain === "solana"
          ? "Solana discovery is research-only until a Solana execution path exists."
          : "EVM discovery requires chain deployment and explicit allowlisting before execution.",
      risk_flags: index === 0 ? [] : ["thin liquidity"]
    })) satisfies TokenDiscoveryCandidate[];
  });

  return {
    generatedAt: new Date().toISOString(),
    source: "dev-mock discovery",
    category: payload.category,
    chains: payload.chains,
    candidates: candidates.slice(0, payload.limit)
  };
}
