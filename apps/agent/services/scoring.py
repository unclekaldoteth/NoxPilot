from __future__ import annotations

from datetime import datetime, timezone

from schemas import Recommendation, TokenSignals
from services.market_data import MARKET_DATA_SOURCE, build_market_snapshot, fetch_market_rows


BIAS_SCORE_OFFSET = {
    "defensive": -2.0,
    "neutral": 0.0,
    "aggressive": 2.5,
}


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


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
