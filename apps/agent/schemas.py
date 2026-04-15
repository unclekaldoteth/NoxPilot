from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok"]
    mode: str
    timestamp: str


class ResearchRankRequest(BaseModel):
    whitelist: list[str] = Field(min_length=1)
    portfolio_bias: Literal["neutral", "defensive", "aggressive"] = "neutral"


class TokenSignals(BaseModel):
    symbol: str
    momentum_signal: float
    sentiment_signal: float
    liquidity_signal: float
    volatility_signal: float
    market_note: str
    market_price_usd: float | None = None
    price_change_pct_24h: float | None = None
    volume_24h_usd: float | None = None
    market_cap_rank: int | None = None
    market_source: str | None = None
    market_observed_at: str | None = None


class Recommendation(BaseModel):
    symbol: str
    score: float
    confidence: float
    momentum_signal: float
    sentiment_signal: float
    liquidity_signal: float
    volatility_signal: float | None = None
    risk_note: str
    thesis: str
    expected_move_pct: float
    market_price_usd: float | None = None
    price_change_pct_24h: float | None = None
    volume_24h_usd: float | None = None
    market_cap_rank: int | None = None
    market_source: str | None = None
    market_observed_at: str | None = None


class ResearchRankResponse(BaseModel):
    generatedAt: str
    candidates: list[Recommendation]
    bestCandidate: Recommendation


class ResearchExplainRequest(BaseModel):
    recommendation: Recommendation
    min_confidence: float | None = None
    allowed_protocol: str | None = None


class ResearchExplainResponse(BaseModel):
    summary: str
    checks: list[str]
    operator_note: str


class MockMarketRequest(BaseModel):
    whitelist: list[str] = Field(default_factory=lambda: ["ETH", "ARB", "USDC", "LINK"])


class MockMarketResponse(BaseModel):
    generatedAt: str
    signals: list[TokenSignals]
