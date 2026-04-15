from __future__ import annotations

from schemas import Recommendation, ResearchExplainResponse


def explain_recommendation(
    recommendation: Recommendation,
    min_confidence: float | None = None,
    allowed_protocol: str | None = None,
) -> ResearchExplainResponse:
    checks: list[str] = [
        f"Score {recommendation.score:.1f} leads the ranked shortlist.",
        f"Confidence reads {recommendation.confidence:.1f} with liquidity at {recommendation.liquidity_signal:.1f}.",
        recommendation.risk_note,
    ]

    if recommendation.market_source:
        checks.append(f"Live market inputs came from {recommendation.market_source}.")

    if min_confidence is not None:
        if recommendation.confidence >= min_confidence:
            checks.append(f"Confidence clears the confidential threshold of {min_confidence:.1f}.")
        else:
            checks.append(f"Confidence fails the confidential threshold of {min_confidence:.1f}.")

    if allowed_protocol:
        checks.append(f"Execution remains scoped to {allowed_protocol}.")

    summary = (
        f"{recommendation.symbol} is the top candidate because its momentum, liquidity, and sentiment signals "
        "combine into a strong bounded-execution profile for the current session."
    )
    operator_note = (
        "This is research output only. The execution layer still needs to validate budget, token whitelist, "
        "session status, and confidential policy thresholds."
    )

    return ResearchExplainResponse(summary=summary, checks=checks, operator_note=operator_note)
