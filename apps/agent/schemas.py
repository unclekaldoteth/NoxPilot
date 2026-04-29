from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


TokenDiscoveryCategory = Literal["meme", "defi", "ai", "gaming", "rwa", "trending"]
TokenDiscoveryChain = Literal["arbitrum-sepolia", "base", "bsc", "solana"]
TokenExecutionStatus = Literal["executable", "needs_allowlist", "research_only", "unsupported_chain"]


class TokenDiscoveryCandidate(BaseModel):
    symbol: str
    name: str
    chain_id: str
    chain_label: str
    chain_type: Literal["evm", "solana"]
    token_address: str
    pair_address: str | None = None
    dex_id: str | None = None
    dex_url: str | None = None
    category: TokenDiscoveryCategory
    price_usd: float | None = None
    price_change_pct_24h: float | None = None
    volume_24h_usd: float | None = None
    liquidity_usd: float | None = None
    market_cap_usd: float | None = None
    fdv_usd: float | None = None
    pair_created_at: str | None = None
    quote_token_symbol: str | None = None
    txns_24h: int = 0
    execution_status: TokenExecutionStatus
    execution_note: str
    risk_flags: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok"]
    mode: str
    timestamp: str
    market_data_source: str
    discovery_source: str
    chain_gpt: dict[str, str | bool | None]


class ResearchRankRequest(BaseModel):
    whitelist: list[str] = Field(min_length=1)
    portfolio_bias: Literal["neutral", "defensive", "aggressive"] = "neutral"
    candidates: list[TokenDiscoveryCandidate] | None = None


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
    chain_id: str | None = None
    chain_label: str | None = None
    chain_type: Literal["evm", "solana"] | None = None
    token_address: str | None = None
    pair_address: str | None = None
    dex_id: str | None = None
    dex_url: str | None = None
    category: TokenDiscoveryCategory | None = None
    liquidity_usd: float | None = None
    execution_status: TokenExecutionStatus | None = None
    execution_note: str | None = None
    risk_flags: list[str] | None = None


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
    provider: str = "Local deterministic explainer"
    model: str | None = None


class MockMarketRequest(BaseModel):
    whitelist: list[str] = Field(default_factory=lambda: ["ETH", "ARB", "USDC", "LINK"])


class MockMarketResponse(BaseModel):
    generatedAt: str
    signals: list[TokenSignals]


class TokenDiscoveryRequest(BaseModel):
    category: TokenDiscoveryCategory = "meme"
    chains: list[TokenDiscoveryChain] = Field(default_factory=lambda: ["base", "bsc", "solana"], min_length=1)
    limit: int = Field(default=9, ge=1, le=24)
    min_liquidity_usd: float = Field(default=10000, ge=0)
    min_volume_24h_usd: float = Field(default=1000, ge=0)
    risk_mode: Literal["conservative", "balanced", "aggressive"] = "balanced"


class TokenDiscoveryResponse(BaseModel):
    generatedAt: str
    source: str
    category: TokenDiscoveryCategory
    chains: list[TokenDiscoveryChain]
    candidates: list[TokenDiscoveryCandidate]
