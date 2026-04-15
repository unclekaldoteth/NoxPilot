from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    HealthResponse,
    MockMarketRequest,
    MockMarketResponse,
    ResearchExplainRequest,
    ResearchExplainResponse,
    ResearchRankRequest,
    ResearchRankResponse,
)
from services.explainer import explain_recommendation
from services.scoring import load_market_snapshots, rank_tokens, utc_now_iso

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
        candidates = await rank_tokens(payload.whitelist, payload.portfolio_bias)
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


@app.post("/research/explain", response_model=ResearchExplainResponse)
async def research_explain(payload: ResearchExplainRequest) -> ResearchExplainResponse:
    return explain_recommendation(
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
