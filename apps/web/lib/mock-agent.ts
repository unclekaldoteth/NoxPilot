import type { Recommendation, ResearchRankResponse } from "@noxpilot/shared";

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
  portfolioBias: "neutral" | "defensive" | "aggressive" = "neutral"
): ResearchRankResponse {
  const candidates = whitelist
    .map((symbol) => buildMockRecommendation(symbol, portfolioBias))
    .sort((left, right) => right.score - left.score);

  return {
    generatedAt: new Date().toISOString(),
    candidates,
    bestCandidate: candidates[0]
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
      "This is research output only. The execution layer still validates budget, token whitelist, session status, and confidential policy thresholds."
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
