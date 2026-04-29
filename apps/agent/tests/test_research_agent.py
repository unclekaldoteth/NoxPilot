from __future__ import annotations

import asyncio
import os
import sys
import unittest
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_DIR))

from schemas import Recommendation, TokenDiscoveryCandidate
from services.chaingpt import chaingpt_health
from services.explainer import LOCAL_EXPLAINER_PROVIDER, explain_recommendation_with_chain_gpt
from services.scoring import build_discovered_recommendation


class ResearchAgentTests(unittest.TestCase):
    def test_executable_discovered_candidate_gets_rankable_recommendation(self) -> None:
        candidate = TokenDiscoveryCandidate(
            symbol="ARB",
            name="ARB executable lane",
            chain_id="421614",
            chain_label="Arbitrum Sepolia",
            chain_type="evm",
            token_address="0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E",
            category="trending",
            price_change_pct_24h=7.8,
            volume_24h_usd=2_400_000,
            liquidity_usd=980_000,
            txns_24h=1260,
            execution_status="executable",
            execution_note="Token, route, guard, and wrapper are configured.",
        )

        recommendation = build_discovered_recommendation(candidate)

        self.assertEqual(recommendation.symbol, "ARB")
        self.assertEqual(recommendation.execution_status, "executable")
        self.assertGreaterEqual(recommendation.confidence, 70)
        self.assertIn("Arbitrum Sepolia", recommendation.risk_note)

    def test_chaingpt_health_does_not_expose_api_key(self) -> None:
        os.environ["CHAINGPT_API_KEY"] = "test-secret-key"

        health = chaingpt_health()

        self.assertTrue(health["configured"])
        self.assertNotIn("test-secret-key", str(health))

    def test_explainer_falls_back_without_chaingpt_key(self) -> None:
        previous_key = os.environ.pop("CHAINGPT_API_KEY", None)
        recommendation = Recommendation(
            symbol="LINK",
            score=82,
            confidence=81,
            momentum_signal=78,
            sentiment_signal=74,
            liquidity_signal=90,
            volatility_signal=30,
            risk_note="Bounded execution remains required.",
            thesis="LINK has enough liquidity for the configured demo lane.",
            expected_move_pct=2.1,
        )

        try:
            response = asyncio.run(explain_recommendation_with_chain_gpt(recommendation, 78, "NoxPilot"))
        finally:
            if previous_key is not None:
                os.environ["CHAINGPT_API_KEY"] = previous_key

        self.assertEqual(response.provider, LOCAL_EXPLAINER_PROVIDER)
        self.assertIn("LINK", response.summary)


if __name__ == "__main__":
    unittest.main()
