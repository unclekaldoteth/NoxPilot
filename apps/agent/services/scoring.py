from __future__ import annotations

from datetime import datetime, timezone

import math

from schemas import Recommendation, TokenDiscoveryCandidate, TokenSignals
from services.market_data import MARKET_DATA_SOURCE, build_market_snapshot, fetch_market_rows


BIAS_SCORE_OFFSET = {
    "defensive": -2.0,
    "neutral": 0.0,
    "aggressive": 2.5,
}


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def build_recommendation(market: TokenSignals, portfolio_bias: str = "neutral") -> Recommendation:
    score = (
        market.momentum_signal * 0.38
        + market.sentiment_signal * 0.24
        + market.liquidity_signal * 0.26
        - market.volatility_signal * 0.12
        + BIAS_SCORE_OFFSET.get(portfolio_bias, 0.0)
    )
    confidence = (
        market.momentum_signal * 0.36
        + market.sentiment_signal * 0.18
        + market.liquidity_signal * 0.30
        + (100 - market.volatility_signal) * 0.16
    )

    expected_move_pct = round((market.momentum_signal - 50) / 16.5, 2)
    risk_note = (
        "Volatility remains elevated relative to liquidity, so execution should stay within a tight budget."
        if market.volatility_signal >= 56
        else "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy."
    )
    thesis = (
        f"{market.symbol} ranks well because liquidity remains supportive while momentum and sentiment are aligned enough "
        "for a short-duration, policy-constrained execution window."
    )

    return Recommendation(
        symbol=market.symbol,
        score=round(score, 2),
        confidence=round(confidence, 2),
        momentum_signal=market.momentum_signal,
        sentiment_signal=market.sentiment_signal,
        liquidity_signal=market.liquidity_signal,
        volatility_signal=market.volatility_signal,
        risk_note=risk_note,
        thesis=thesis,
        expected_move_pct=expected_move_pct,
        market_price_usd=market.market_price_usd,
        price_change_pct_24h=market.price_change_pct_24h,
        volume_24h_usd=market.volume_24h_usd,
        market_cap_rank=market.market_cap_rank,
        market_source=market.market_source or MARKET_DATA_SOURCE,
        market_observed_at=market.market_observed_at,
    )


async def load_market_snapshots(whitelist: list[str]) -> list[TokenSignals]:
    rows = await fetch_market_rows(whitelist)
    return [build_market_snapshot(symbol, rows[symbol]) for symbol in whitelist]


async def rank_tokens(whitelist: list[str], portfolio_bias: str = "neutral") -> list[Recommendation]:
    signals = await load_market_snapshots(whitelist)
    ranked = [build_recommendation(signal, portfolio_bias) for signal in signals]
    return sorted(ranked, key=lambda item: (item.score, item.confidence), reverse=True)


def build_discovered_recommendation(
    candidate: TokenDiscoveryCandidate,
    portfolio_bias: str = "neutral",
) -> Recommendation:
    liquidity_signal = _clamp(24.0 + math.log10(max(candidate.liquidity_usd or 1, 1)) * 8.4)
    volume_signal = _clamp(20.0 + math.log10(max(candidate.volume_24h_usd or 1, 1)) * 8.0)
    tx_signal = _clamp(35.0 + math.log10(max(candidate.txns_24h, 1)) * 15.0)
    price_change = candidate.price_change_pct_24h or 0.0
    momentum_signal = _clamp(50.0 + price_change * 1.35)
    sentiment_signal = _clamp(volume_signal * 0.42 + liquidity_signal * 0.35 + tx_signal * 0.23)
    volatility_signal = _clamp(abs(price_change) * 2.3)
    execution_bonus = 14.0 if candidate.execution_status == "executable" else 0.0

    score = (
        momentum_signal * 0.34
        + sentiment_signal * 0.24
        + liquidity_signal * 0.28
        - volatility_signal * 0.14
        + BIAS_SCORE_OFFSET.get(portfolio_bias, 0.0)
        - len(candidate.risk_flags) * 1.8
        + execution_bonus
    )
    confidence = (
        liquidity_signal * 0.34
        + volume_signal * 0.24
        + tx_signal * 0.18
        + (100 - volatility_signal) * 0.18
        - len(candidate.risk_flags) * 1.4
        + execution_bonus * 0.6
    )

    expected_move_pct = round(max(min(price_change / 8.0, 7.5), -7.5), 2)
    risk_note = (
        f"{candidate.chain_label} candidate is {candidate.execution_status.replace('_', ' ')}. "
        f"{candidate.execution_note}"
    )
    if candidate.risk_flags:
        risk_note = f"{risk_note} Flags: {', '.join(candidate.risk_flags)}."

    return Recommendation(
        symbol=candidate.symbol,
        score=round(_clamp(score), 2),
        confidence=round(_clamp(confidence), 2),
        momentum_signal=round(momentum_signal, 2),
        sentiment_signal=round(sentiment_signal, 2),
        liquidity_signal=round(liquidity_signal, 2),
        volatility_signal=round(volatility_signal, 2),
        risk_note=risk_note,
        thesis=(
            f"{candidate.symbol} surfaced from {candidate.category} discovery on {candidate.chain_label}; "
            "the ranking uses live DEX liquidity, volume, transaction activity, and 24h momentum signals."
        ),
        expected_move_pct=expected_move_pct,
        market_price_usd=candidate.price_usd,
        price_change_pct_24h=candidate.price_change_pct_24h,
        volume_24h_usd=candidate.volume_24h_usd,
        market_source="DexScreener discovery",
        market_observed_at=None,
        chain_id=candidate.chain_id,
        chain_label=candidate.chain_label,
        chain_type=candidate.chain_type,
        token_address=candidate.token_address,
        pair_address=candidate.pair_address,
        dex_id=candidate.dex_id,
        dex_url=candidate.dex_url,
        category=candidate.category,
        liquidity_usd=candidate.liquidity_usd,
        execution_status=candidate.execution_status,
        execution_note=candidate.execution_note,
        risk_flags=candidate.risk_flags,
    )


async def rank_discovered_candidates(
    candidates: list[TokenDiscoveryCandidate],
    portfolio_bias: str = "neutral",
) -> list[Recommendation]:
    ranked = [build_discovered_recommendation(candidate, portfolio_bias) for candidate in candidates]
    return sorted(ranked, key=lambda item: (item.score, item.confidence), reverse=True)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
