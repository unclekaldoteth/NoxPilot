from __future__ import annotations

import math
import os
from typing import Any

import httpx

from schemas import TokenSignals


MARKET_DATA_BASE_URL = os.getenv("MARKET_DATA_BASE_URL", "https://api.coingecko.com/api/v3").rstrip("/")
MARKET_DATA_TIMEOUT_SECONDS = float(os.getenv("MARKET_DATA_TIMEOUT_SECONDS", "10"))
MARKET_DATA_SOURCE = os.getenv("MARKET_DATA_SOURCE", "CoinGecko markets")

SYMBOL_TO_COINGECKO_ID: dict[str, str] = {
    "ETH": "ethereum",
    "ARB": "arbitrum",
    "USDC": "usd-coin",
    "LINK": "chainlink",
}


def normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def resolve_supported_symbols(whitelist: list[str]) -> list[str]:
    normalized = [normalize_symbol(symbol) for symbol in whitelist]
    unsupported = [symbol for symbol in normalized if symbol not in SYMBOL_TO_COINGECKO_ID]
    if unsupported:
        joined = ", ".join(unsupported)
        raise ValueError(
            f"Unsupported token symbol(s) for the live market-data provider: {joined}. "
            f"Supported symbols: {', '.join(sorted(SYMBOL_TO_COINGECKO_ID))}."
        )
    return normalized


async def fetch_market_rows(whitelist: list[str]) -> dict[str, dict[str, Any]]:
    supported = resolve_supported_symbols(whitelist)
    requested_ids = [SYMBOL_TO_COINGECKO_ID[symbol] for symbol in supported]

    async with httpx.AsyncClient(timeout=MARKET_DATA_TIMEOUT_SECONDS) as client:
        response = await client.get(
            f"{MARKET_DATA_BASE_URL}/coins/markets",
            params={
                "vs_currency": "usd",
                "ids": ",".join(requested_ids),
                "sparkline": "false",
                "price_change_percentage": "24h",
            },
        )
        response.raise_for_status()
        rows = response.json()

    indexed: dict[str, dict[str, Any]] = {}
    for row in rows:
        symbol = normalize_symbol(str(row.get("symbol", "")))
        if symbol:
            indexed[symbol] = row

    missing = [symbol for symbol in supported if symbol not in indexed]
    if missing:
        raise ValueError(
            f"Live market data provider returned no market rows for: {', '.join(missing)}."
        )

    return indexed


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def build_market_snapshot(symbol: str, row: dict[str, Any]) -> TokenSignals:
    current_price = _safe_float(row.get("current_price"))
    price_change_pct_24h = _safe_float(row.get("price_change_percentage_24h"))
    total_volume = _safe_float(row.get("total_volume"))
    market_cap = _safe_float(row.get("market_cap"))
    market_cap_rank_raw = row.get("market_cap_rank")
    market_cap_rank = int(market_cap_rank_raw) if market_cap_rank_raw is not None else None
    high_24h = _safe_float(row.get("high_24h"), current_price)
    low_24h = _safe_float(row.get("low_24h"), current_price)

    turnover_ratio = total_volume / market_cap if market_cap > 0 else 0.0
    intraday_range_pct = ((high_24h - low_24h) / current_price * 100.0) if current_price > 0 else 0.0

    momentum_signal = _clamp(50.0 + (price_change_pct_24h * 3.2))
    sentiment_rank_penalty = 0.0 if market_cap_rank is None else min(max(market_cap_rank - 10, 0) * 0.38, 26.0)
    sentiment_signal = _clamp(58.0 + (price_change_pct_24h * 2.1) - sentiment_rank_penalty)
    liquidity_signal = _clamp(25.0 + (math.log10(max(total_volume, 1.0)) * 6.0) + (turnover_ratio * 100.0))
    volatility_signal = _clamp(intraday_range_pct * 7.5)

    if volatility_signal >= 65:
        note = "Intraday range is elevated relative to the current price, so the session should stay tightly bounded."
    elif liquidity_signal >= 80 and momentum_signal >= 65:
        note = "Volume and momentum are both supportive enough for a single bounded session."
    else:
        note = "Market structure is live and tradable, but signal quality still warrants explicit policy checks."

    return TokenSignals(
        symbol=symbol,
        momentum_signal=round(momentum_signal, 2),
        sentiment_signal=round(sentiment_signal, 2),
        liquidity_signal=round(liquidity_signal, 2),
        volatility_signal=round(volatility_signal, 2),
        market_note=note,
        market_price_usd=round(current_price, 6) if current_price > 0 else None,
        price_change_pct_24h=round(price_change_pct_24h, 4),
        volume_24h_usd=round(total_volume, 2),
        market_cap_rank=market_cap_rank,
        market_source=MARKET_DATA_SOURCE,
        market_observed_at=row.get("last_updated"),
    )
