from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from typing import Any

import httpx

from schemas import TokenDiscoveryCandidate, TokenDiscoveryCategory, TokenDiscoveryChain


DEXSCREENER_BASE_URL = os.getenv("DEXSCREENER_BASE_URL", "https://api.dexscreener.com").rstrip("/")
DEXSCREENER_TIMEOUT_SECONDS = float(os.getenv("DEXSCREENER_TIMEOUT_SECONDS", "10"))
DISCOVERY_SOURCE = "DexScreener search"

CHAIN_METADATA: dict[str, dict[str, str]] = {
    "arbitrum-sepolia": {"label": "Arbitrum Sepolia", "type": "evm"},
    "base": {"label": "Base", "type": "evm"},
    "bsc": {"label": "BNB Chain", "type": "evm"},
    "solana": {"label": "Solana", "type": "solana"},
}

CATEGORY_QUERIES: dict[str, list[str]] = {
    "meme": ["meme", "pepe", "dog", "cat"],
    "defi": ["defi", "yield", "swap", "staking"],
    "ai": ["ai", "agent", "gpt", "compute"],
    "gaming": ["gaming", "gamefi", "play"],
    "rwa": ["rwa", "real world assets", "treasury"],
    "trending": ["trending", "hot", "new"],
}


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(parsed) or math.isinf(parsed):
        return None
    return parsed


def _safe_int(value: Any) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _ms_to_iso(value: Any) -> str | None:
    timestamp = _safe_float(value)
    if timestamp is None or timestamp <= 0:
        return None
    return datetime.fromtimestamp(timestamp / 1000, timezone.utc).isoformat()


def _execution_status(chain_id: str) -> tuple[str, str]:
    chain_type = CHAIN_METADATA.get(chain_id, {}).get("type")
    if chain_type == "solana":
        return (
            "research_only",
            "Solana discovery is research-only until a separate Solana wallet/program execution path exists.",
        )
    if chain_type == "evm":
        return (
            "needs_allowlist",
            "EVM candidate discovered off the current Arbitrum Sepolia deployment; deploy/configure that chain and explicitly allowlist before execution.",
        )
    return ("unsupported_chain", "This chain is not supported by the current NoxPilot execution stack.")


def _risk_flags(liquidity_usd: float | None, volume_24h_usd: float | None, pair_created_at: str | None) -> list[str]:
    flags: list[str] = []
    if liquidity_usd is None or liquidity_usd < 25_000:
        flags.append("thin liquidity")
    if volume_24h_usd is None or volume_24h_usd < 5_000:
        flags.append("low 24h volume")
    if pair_created_at:
        created_at = datetime.fromisoformat(pair_created_at)
        age_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
        if age_hours < 72:
            flags.append("new pair")
    return flags


def _candidate_sort_score(candidate: TokenDiscoveryCandidate) -> float:
    liquidity = math.log10(max(candidate.liquidity_usd or 1, 1))
    volume = math.log10(max(candidate.volume_24h_usd or 1, 1))
    txns = math.log10(max(candidate.txns_24h, 1))
    momentum = abs(candidate.price_change_pct_24h or 0)
    risk_penalty = len(candidate.risk_flags) * 1.4
    return liquidity * 3.0 + volume * 2.2 + txns * 1.1 + min(momentum / 20, 3.0) - risk_penalty


def _build_candidate(pair: dict[str, Any], category: TokenDiscoveryCategory) -> TokenDiscoveryCandidate | None:
    chain_id = str(pair.get("chainId", "")).lower()
    metadata = CHAIN_METADATA.get(chain_id)
    if not metadata:
        return None

    base_token = pair.get("baseToken")
    if not isinstance(base_token, dict):
        return None

    symbol = str(base_token.get("symbol") or "").strip()
    address = str(base_token.get("address") or "").strip()
    if not symbol or not address:
        return None

    quote_token = pair.get("quoteToken") if isinstance(pair.get("quoteToken"), dict) else {}
    liquidity_usd = _safe_float((pair.get("liquidity") or {}).get("usd") if isinstance(pair.get("liquidity"), dict) else None)
    volume_24h_usd = _safe_float((pair.get("volume") or {}).get("h24") if isinstance(pair.get("volume"), dict) else None)
    price_change_pct_24h = _safe_float((pair.get("priceChange") or {}).get("h24") if isinstance(pair.get("priceChange"), dict) else None)
    txns_h24 = pair.get("txns", {}).get("h24", {}) if isinstance(pair.get("txns"), dict) else {}
    txns_24h = _safe_int(txns_h24.get("buys") if isinstance(txns_h24, dict) else 0) + _safe_int(
        txns_h24.get("sells") if isinstance(txns_h24, dict) else 0
    )
    pair_created_at = _ms_to_iso(pair.get("pairCreatedAt"))
    execution_status, execution_note = _execution_status(chain_id)

    return TokenDiscoveryCandidate(
        symbol=symbol.upper(),
        name=str(base_token.get("name") or symbol).strip(),
        chain_id=chain_id,
        chain_label=metadata["label"],
        chain_type=metadata["type"],  # type: ignore[arg-type]
        token_address=address,
        pair_address=str(pair.get("pairAddress") or ""),
        dex_id=str(pair.get("dexId") or ""),
        dex_url=str(pair.get("url") or ""),
        category=category,
        price_usd=_safe_float(pair.get("priceUsd")),
        price_change_pct_24h=price_change_pct_24h,
        volume_24h_usd=volume_24h_usd,
        liquidity_usd=liquidity_usd,
        market_cap_usd=_safe_float(pair.get("marketCap")),
        fdv_usd=_safe_float(pair.get("fdv")),
        pair_created_at=pair_created_at,
        quote_token_symbol=str(quote_token.get("symbol") or ""),
        txns_24h=txns_24h,
        execution_status=execution_status,  # type: ignore[arg-type]
        execution_note=execution_note,
        risk_flags=_risk_flags(liquidity_usd, volume_24h_usd, pair_created_at),
    )


async def discover_tokens(
    category: TokenDiscoveryCategory,
    chains: list[TokenDiscoveryChain],
    limit: int,
    min_liquidity_usd: float,
    min_volume_24h_usd: float,
    risk_mode: str,
) -> list[TokenDiscoveryCandidate]:
    queries = CATEGORY_QUERIES.get(category, [category])
    candidates_by_key: dict[str, TokenDiscoveryCandidate] = {}

    async with httpx.AsyncClient(timeout=DEXSCREENER_TIMEOUT_SECONDS) as client:
        for chain in chains:
            if chain == "arbitrum-sepolia":
                continue
            for query in queries:
                response = await client.get(
                    f"{DEXSCREENER_BASE_URL}/latest/dex/search",
                    params={"q": f"{chain} {query}"},
                )
                response.raise_for_status()
                payload = response.json()
                for pair in payload.get("pairs", []) if isinstance(payload, dict) else []:
                    if not isinstance(pair, dict) or str(pair.get("chainId", "")).lower() != chain:
                        continue
                    candidate = _build_candidate(pair, category)
                    if not candidate:
                        continue
                    if (candidate.liquidity_usd or 0) < min_liquidity_usd:
                        continue
                    if (candidate.volume_24h_usd or 0) < min_volume_24h_usd:
                        continue
                    if risk_mode == "conservative" and candidate.risk_flags:
                        continue

                    key = f"{candidate.chain_id}:{candidate.token_address.lower()}"
                    current = candidates_by_key.get(key)
                    if current is None or (candidate.liquidity_usd or 0) > (current.liquidity_usd or 0):
                        candidates_by_key[key] = candidate

    candidates = sorted(candidates_by_key.values(), key=_candidate_sort_score, reverse=True)
    return candidates[:limit]
