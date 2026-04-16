from __future__ import annotations

import json
import os
from typing import Any

import httpx

from schemas import Recommendation, ResearchExplainResponse


CHAINGPT_BASE_URL = os.getenv("CHAINGPT_BASE_URL", "https://api.chaingpt.org").rstrip("/")
CHAINGPT_MODEL = os.getenv("CHAINGPT_MODEL", "general_assistant")
CHAINGPT_TIMEOUT_SECONDS = float(os.getenv("CHAINGPT_TIMEOUT_SECONDS", "6"))
CHAINGPT_PROVIDER_LABEL = "ChainGPT Web3 LLM"


class ChainGPTUnavailable(RuntimeError):
    """Raised when ChainGPT cannot produce a usable analyst response."""


def chaingpt_configured() -> bool:
    return bool(os.getenv("CHAINGPT_API_KEY", "").strip())


def _trim(value: str, limit: int = 520) -> str:
    normalized = " ".join(value.strip().split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}..."


def _format_optional_number(value: float | int | None, suffix: str = "") -> str:
    if value is None:
        return "n/a"
    return f"{value}{suffix}"


def _build_question(
    recommendation: Recommendation,
    min_confidence: float | None,
    allowed_protocol: str | None,
) -> str:
    threshold = "not provided" if min_confidence is None else f"{min_confidence:.1f}"
    protocol = allowed_protocol or "NoxPilot ExecutionGuard Session"

    return f"""
You are ChainGPT, acting as a Web3 market research analyst inside NoxPilot.

NoxPilot is a bounded execution demo: AI research may recommend a token, but wallet execution is still constrained by encrypted policy handles, token whitelist checks, daily budget checks, session status, and the ExecutionGuard contract.

Use only the supplied market snapshot. Do not invent extra market prices, social data, or on-chain facts.

Top candidate:
- Symbol: {recommendation.symbol}
- Score: {recommendation.score:.2f}/100
- Confidence: {recommendation.confidence:.2f}/100
- Confidential confidence threshold: {threshold}
- Momentum signal: {recommendation.momentum_signal:.2f}/100
- Sentiment signal: {recommendation.sentiment_signal:.2f}/100
- Liquidity signal: {recommendation.liquidity_signal:.2f}/100
- Volatility signal: {_format_optional_number(recommendation.volatility_signal, "/100")}
- Expected move: {recommendation.expected_move_pct:.2f}%
- USD price: {_format_optional_number(recommendation.market_price_usd)}
- 24h price change: {_format_optional_number(recommendation.price_change_pct_24h, "%")}
- 24h volume USD: {_format_optional_number(recommendation.volume_24h_usd)}
- Market cap rank: {_format_optional_number(recommendation.market_cap_rank)}
- Market source: {recommendation.market_source or "not provided"}
- Market observed at: {recommendation.market_observed_at or "not provided"}
- Chain: {recommendation.chain_label or "current configured execution chain"}
- Token address: {recommendation.token_address or "not provided"}
- Execution status: {recommendation.execution_status or "not provided"}
- Execution note: {recommendation.execution_note or "not provided"}
- Risk flags: {", ".join(recommendation.risk_flags or []) or "none"}
- Existing risk note: {recommendation.risk_note}
- Execution protocol: {protocol}

Return strict JSON only, with this exact shape:
{{
  "summary": "one concise sentence for the operator",
  "checks": ["three concise validation checks"],
  "operator_note": "one sentence explaining this is research only and execution still requires NoxPilot guard validation"
}}
""".strip()


def _extract_bot_text(response_text: str) -> str:
    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError:
        return response_text.strip()

    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("bot"), str):
            return data["bot"].strip()
        if isinstance(payload.get("bot"), str):
            return payload["bot"].strip()
        if isinstance(data, str):
            return data.strip()

    return response_text.strip()


def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ChainGPTUnavailable("ChainGPT returned a non-JSON analyst response.")
        parsed = json.loads(cleaned[start : end + 1])

    if not isinstance(parsed, dict):
        raise ChainGPTUnavailable("ChainGPT analyst response was not a JSON object.")
    return parsed


def _normalize_chain_gpt_response(raw_bot_text: str, recommendation: Recommendation) -> ResearchExplainResponse:
    try:
        parsed = _extract_json_object(raw_bot_text)
    except (json.JSONDecodeError, ChainGPTUnavailable):
        return ResearchExplainResponse(
            summary=_trim(raw_bot_text, 420)
            or f"{recommendation.symbol} is the top candidate according to the ChainGPT analyst layer.",
            checks=[
                f"ChainGPT reviewed the supplied {recommendation.symbol} market snapshot.",
                f"Score {recommendation.score:.1f} and confidence {recommendation.confidence:.1f} remain the deterministic NoxPilot inputs.",
                recommendation.risk_note,
            ],
            operator_note=(
                "ChainGPT generated this analyst narrative, but execution still requires NoxPilot guard validation."
            ),
            provider=CHAINGPT_PROVIDER_LABEL,
            model=CHAINGPT_MODEL,
        )

    checks_raw = parsed.get("checks")
    checks = [
        _trim(str(item), 220)
        for item in (checks_raw if isinstance(checks_raw, list) else [])
        if str(item).strip()
    ][:4]

    if not checks:
        checks = [
            f"Score {recommendation.score:.1f} leads the ranked shortlist.",
            f"Confidence reads {recommendation.confidence:.1f} with liquidity at {recommendation.liquidity_signal:.1f}.",
            recommendation.risk_note,
        ]

    return ResearchExplainResponse(
        summary=_trim(str(parsed.get("summary", "")), 420)
        or f"{recommendation.symbol} is the top candidate after ChainGPT review of the supplied market signals.",
        checks=checks,
        operator_note=_trim(str(parsed.get("operator_note", "")), 360)
        or "ChainGPT generated this analyst narrative, but execution still requires NoxPilot guard validation.",
        provider=CHAINGPT_PROVIDER_LABEL,
        model=CHAINGPT_MODEL,
    )


async def explain_with_chaingpt(
    recommendation: Recommendation,
    min_confidence: float | None = None,
    allowed_protocol: str | None = None,
) -> ResearchExplainResponse:
    api_key = os.getenv("CHAINGPT_API_KEY", "").strip()
    if not api_key:
        raise ChainGPTUnavailable("CHAINGPT_API_KEY is not configured.")

    request_payload = {
        "model": CHAINGPT_MODEL,
        "question": _build_question(recommendation, min_confidence, allowed_protocol),
        "chatHistory": "off",
        "useCustomContext": True,
        "contextInjection": {
            "companyName": "NoxPilot",
            "companyDescription": (
                "A bounded Web3 execution agent that separates AI research from wallet authority using "
                "encrypted policy handles and on-chain guard checks."
            ),
            "aiTone": "PRE_SET_TONE",
            "selectedTone": "PROFESSIONAL",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=CHAINGPT_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{CHAINGPT_BASE_URL}/chat/stream",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )
    except httpx.HTTPError as error:
        raise ChainGPTUnavailable("ChainGPT network request failed.") from error

    if response.status_code in {401, 402, 403}:
        raise ChainGPTUnavailable("ChainGPT authentication or credits are unavailable.")
    if response.status_code >= 400:
        raise ChainGPTUnavailable(f"ChainGPT request failed with HTTP {response.status_code}.")

    bot_text = _extract_bot_text(response.text)
    if not bot_text:
        raise ChainGPTUnavailable("ChainGPT returned an empty analyst response.")

    return _normalize_chain_gpt_response(bot_text, recommendation)
