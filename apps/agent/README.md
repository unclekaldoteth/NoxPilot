# NoxPilot Research Agent

This FastAPI service is the research side of NoxPilot.

- It does not hold wallet keys.
- It does not execute transactions.
- It does not touch Nox handles.
- It fetches live market data, ranks the whitelist, and explains the top candidate.

## Live Data Source

Default provider:

- CoinGecko markets endpoint
- `https://api.coingecko.com/api/v3/coins/markets`

Live inputs used by the scoring pipeline:

- current USD price
- 24h price change percentage
- 24h total volume
- market-cap rank
- intraday range via `high_24h` and `low_24h`

The scoring logic is heuristic. The inputs are live.

## Endpoints

- `GET /health`
- `POST /research/rank`
- `POST /research/explain`
- `POST /research/mock-market`

`/research/mock-market` keeps its legacy name for compatibility, but in the live default path it returns fetched live market snapshots rather than synthetic data.

## Example Payloads

### `POST /research/rank`

Request:

```json
{
  "whitelist": ["ETH", "ARB", "USDC", "LINK"],
  "portfolio_bias": "neutral"
}
```

Response shape:

```json
{
  "generatedAt": "2026-04-15T09:15:00.000Z",
  "candidates": [
    {
      "symbol": "ETH",
      "score": 78.44,
      "confidence": 79.12,
      "momentum_signal": 68.31,
      "sentiment_signal": 71.44,
      "liquidity_signal": 95.02,
      "volatility_signal": 34.18,
      "risk_note": "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.",
      "thesis": "ETH ranks well because liquidity remains supportive while momentum and sentiment are aligned enough for a short-duration, policy-constrained execution window.",
      "expected_move_pct": 1.11,
      "market_price_usd": 3178.14,
      "price_change_pct_24h": 4.81,
      "volume_24h_usd": 21833492012.0,
      "market_cap_rank": 2,
      "market_source": "CoinGecko markets",
      "market_observed_at": "2026-04-15T09:14:43.000Z"
    }
  ],
  "bestCandidate": {
    "symbol": "ETH",
    "score": 78.44,
    "confidence": 79.12,
    "momentum_signal": 68.31,
    "sentiment_signal": 71.44,
    "liquidity_signal": 95.02,
    "volatility_signal": 34.18,
    "risk_note": "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.",
    "thesis": "ETH ranks well because liquidity remains supportive while momentum and sentiment are aligned enough for a short-duration, policy-constrained execution window.",
    "expected_move_pct": 1.11,
    "market_price_usd": 3178.14,
    "price_change_pct_24h": 4.81,
    "volume_24h_usd": 21833492012.0,
    "market_cap_rank": 2,
    "market_source": "CoinGecko markets",
    "market_observed_at": "2026-04-15T09:14:43.000Z"
  }
}
```

### `POST /research/explain`

Request:

```json
{
  "recommendation": {
    "symbol": "ETH",
    "score": 78.44,
    "confidence": 79.12,
    "momentum_signal": 68.31,
    "sentiment_signal": 71.44,
    "liquidity_signal": 95.02,
    "volatility_signal": 34.18,
    "risk_note": "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.",
    "thesis": "ETH ranks well because liquidity remains supportive while momentum and sentiment are aligned enough for a short-duration, policy-constrained execution window.",
    "expected_move_pct": 1.11,
    "market_price_usd": 3178.14,
    "price_change_pct_24h": 4.81,
    "volume_24h_usd": 21833492012.0,
    "market_cap_rank": 2,
    "market_source": "CoinGecko markets",
    "market_observed_at": "2026-04-15T09:14:43.000Z"
  },
  "min_confidence": 78,
  "allowed_protocol": "NoxPilot ExecutionGuard Session"
}
```

Response:

```json
{
  "summary": "ETH is the top candidate because its momentum, liquidity, and sentiment signals combine into a strong bounded-execution profile for the current session.",
  "checks": [
    "Score 78.4 leads the ranked shortlist.",
    "Confidence reads 79.1 with liquidity at 95.0.",
    "Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.",
    "Confidence clears the confidential threshold of 78.0.",
    "Execution remains scoped to NoxPilot ExecutionGuard Session."
  ],
  "operator_note": "This is research output only. The execution layer still needs to validate budget, token whitelist, session status, and confidential policy thresholds."
}
```

### `POST /research/mock-market`

Request:

```json
{
  "whitelist": ["ETH", "ARB", "USDC", "LINK"]
}
```

Response shape:

```json
{
  "generatedAt": "2026-04-15T09:15:00.000Z",
  "signals": [
    {
      "symbol": "ETH",
      "momentum_signal": 68.31,
      "sentiment_signal": 71.44,
      "liquidity_signal": 95.02,
      "volatility_signal": 34.18,
      "market_note": "Volume and momentum are both supportive enough for a single bounded session.",
      "market_price_usd": 3178.14,
      "price_change_pct_24h": 4.81,
      "volume_24h_usd": 21833492012.0,
      "market_cap_rank": 2,
      "market_source": "CoinGecko markets",
      "market_observed_at": "2026-04-15T09:14:43.000Z"
    }
  ]
}
```

## Run Locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/agent/requirements.txt
cd apps/agent
python -m uvicorn main:app --reload
```

## Env

```bash
cp apps/agent/.env.example apps/agent/.env
```

Key values:

- `AGENT_MODE=live`
- `MARKET_DATA_SOURCE=CoinGecko markets`
- `MARKET_DATA_BASE_URL=https://api.coingecko.com/api/v3`
- `MARKET_DATA_TIMEOUT_SECONDS=10`

## Validation

```bash
python3 -m py_compile main.py schemas.py services/*.py
curl -s http://127.0.0.1:8010/health
curl -s http://127.0.0.1:8010/research/rank -H 'content-type: application/json' -d '{"whitelist":["ETH","ARB","USDC","LINK"],"portfolio_bias":"neutral"}'
curl -s http://127.0.0.1:8010/research/explain -H 'content-type: application/json' -d '{"recommendation":{"symbol":"ETH","score":78.44,"confidence":79.12,"momentum_signal":68.31,"sentiment_signal":71.44,"liquidity_signal":95.02,"volatility_signal":34.18,"risk_note":"Signal quality is acceptable for a single bounded session, but not for uncapped autonomy.","thesis":"ETH ranks well because liquidity remains supportive while momentum and sentiment are aligned enough for a short-duration, policy-constrained execution window.","expected_move_pct":1.11,"market_price_usd":3178.14,"price_change_pct_24h":4.81,"volume_24h_usd":21833492012,"market_cap_rank":2,"market_source":"CoinGecko markets","market_observed_at":"2026-04-15T09:14:43.000Z"},"min_confidence":78,"allowed_protocol":"NoxPilot ExecutionGuard Session"}'
```
