from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


def load_local_env() -> None:
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()

from schemas import (
    HealthResponse,
    MockMarketRequest,
    MockMarketResponse,
    ResearchExplainRequest,
    ResearchExplainResponse,
    ResearchRankRequest,
    ResearchRankResponse,
    TokenDiscoveryRequest,
    TokenDiscoveryResponse,
)
from services.discovery import DISCOVERY_SOURCE, discover_tokens
from services.explainer import explain_recommendation_with_chain_gpt
from services.scoring import load_market_snapshots, rank_discovered_candidates, rank_tokens, utc_now_iso

app = FastAPI(title="NoxPilot Research Agent", version="0.1.0")

allowed_origins = os.getenv(
    "AGENT_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        service="noxpilot-research-agent",
        status="ok",
        mode=os.getenv("AGENT_MODE", "live"),
        timestamp=utc_now_iso(),
    )


@app.post("/research/rank", response_model=ResearchRankResponse)
async def research_rank(payload: ResearchRankRequest) -> ResearchRankResponse:
    try:
        candidates = (
            await rank_discovered_candidates(payload.candidates, payload.portfolio_bias)
            if payload.candidates
            else await rank_tokens(payload.whitelist, payload.portfolio_bias)
        )
        return ResearchRankResponse(
            generatedAt=utc_now_iso(),
            candidates=candidates,
            bestCandidate=candidates[0],
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Live market data is unavailable for ranking.",
        ) from error


@app.post("/research/discover", response_model=TokenDiscoveryResponse)
async def research_discover(payload: TokenDiscoveryRequest) -> TokenDiscoveryResponse:
    try:
        candidates = await discover_tokens(
            category=payload.category,
            chains=payload.chains,
            limit=payload.limit,
            min_liquidity_usd=payload.min_liquidity_usd,
            min_volume_24h_usd=payload.min_volume_24h_usd,
            risk_mode=payload.risk_mode,
        )
        return TokenDiscoveryResponse(
            generatedAt=utc_now_iso(),
            source=DISCOVERY_SOURCE,
            category=payload.category,
            chains=payload.chains,
            candidates=candidates,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Token discovery data is unavailable.",
        ) from error


@app.post("/research/explain", response_model=ResearchExplainResponse)
async def research_explain(payload: ResearchExplainRequest) -> ResearchExplainResponse:
    return await explain_recommendation_with_chain_gpt(
        recommendation=payload.recommendation,
        min_confidence=payload.min_confidence,
        allowed_protocol=payload.allowed_protocol,
    )


@app.post("/research/mock-market", response_model=MockMarketResponse)
async def research_mock_market(payload: MockMarketRequest) -> MockMarketResponse:
    try:
        signals = await load_market_snapshots(payload.whitelist)
        return MockMarketResponse(generatedAt=utc_now_iso(), signals=signals)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Live market data is unavailable for snapshot inspection.",
        ) from error
