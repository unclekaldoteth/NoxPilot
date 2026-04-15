# NoxPilot Architecture

## System Overview

NoxPilot has four execution domains:

1. `apps/web`: Next.js operator console and judged demo path
2. `apps/agent`: FastAPI research engine fed by live market data
3. `packages/*`: shared schemas, Nox wrapper, and UI primitives
4. `contracts`: Foundry contracts for bounded session control

## Trust Boundary

The core trust model is unchanged:

- the Python agent ranks and explains
- the TypeScript layer decides and executes
- the vault wallet remains distinct from the execution role
- Nox Handle encryption stays in TypeScript, not Python

The research service never gets spending authority.

## Canonical Live Path

```text
Connected wallet
  -> Arbitrum Sepolia network check
  -> PolicyVault / ExecutionGuard reads
  -> wallet-backed @iexec-nox/handle encryption
  -> PolicyVault.updatePolicyWithNox()
  -> ExecutionGuard.syncPolicyWhitelistRoot()
  -> ExecutionGuard.setAllowedToken()
  -> ExecutionGuard.setAllowedTokenAddress()

Web app
  -> /api/research/rank
  -> FastAPI /research/rank
  -> CoinGecko markets
  -> ranked live recommendation

TypeScript execution layer
  -> evaluate live recommendation against policy + current contract state
  -> PolicyVault.openSession()
  -> approve session asset
  -> ExecutionGuard.fundSessionAsset()
  -> ExecutionGuard.prepareConfidenceApproval()
  -> Handle client publicDecrypt(confidenceApprovalHandle)
  -> live quoter read
  -> ExecutionGuard.executeExactInputSingle()
  -> ExecutionGuard.settleSessionAssets()

Dashboard / timeline
  -> render live wallet state
  -> render live contract state
  -> render live research payloads
  -> append only real actions and real agent responses
```

## Contract Role Split

### `PolicyVault`

- stores owner, execution wallet, execution controller, pause state
- stores encrypted policy handle references and public-safe metadata reference
- validates the confidential daily budget and min-confidence threshold through `Nox.fromExternal(...)` in the live judged path
- opens and closes bounded sessions
- tracks funded, spent, and settled session values

### `ExecutionGuard`

- anchors its allowlist to the current vault whitelist root
- validates execution wallet identity and session liveness
- prepares a publicly decryptable confidence-approval handle from the confidential min-confidence threshold stored in `PolicyVault`
- holds the funded session asset during the active session
- executes one exact-input router swap inside the bounded path
- sweeps session assets back to the vault owner on settlement

## Research Agent Data Flow

The default path no longer uses synthetic market signals.

- `apps/agent/services/market_data.py` fetches live rows from CoinGecko markets
- `apps/agent/services/scoring.py` transforms live price, volume, rank, and range into heuristic signals
- `/research/rank` returns a ranked shortlist plus a best candidate
- `/research/explain` explains the live-ranked candidate

The heuristics are lightweight. The inputs are live.

## Nox Integration Boundary

`packages/nox-sdk` is the integration boundary for `@iexec-nox/handle`.

- live mode requires a wallet-backed viem client
- the application contract address is supplied from env
- the web provider encrypts policy values on the client side before writing handle references on-chain
- server-side mock encryption is isolated behind explicit dev-mock opt-in only

The contracts still store references for some fields, not full confidential proof verification everywhere.
The daily-budget and min-confidence fields are now the real Nox-native confidential path: they are encrypted with `@iexec-nox/handle`, submitted with handle proofs, validated in `PolicyVault`, and used to prepare an on-chain confidence-approval handle before execution.

## Live-by-Default Runtime Rules

- `NEXT_PUBLIC_APP_MODE=live` is the default
- missing live config produces an honest error, not a fake success state
- mock mode only appears when `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`
- research API routes call the live agent first and only use mock payloads in explicit dev mode

## What Remains Intentionally Scoped

- the live trading path is intentionally one exact-input swap route, not a generic DEX aggregation engine
- only the daily-budget and min-confidence policy fields are validated through the Nox proof path on-chain
- wallet balances are real; session budgets remain live USD-denominated control values alongside the session-asset accounting

That is smaller than a full trading stack, but it is real and aligned with the product boundary.

## End-to-End Live Validation

### Required Components

- owner/admin wallet connected in the browser
- Arbitrum Sepolia RPC
- deployed `PolicyVault`
- deployed `ExecutionGuard`
- public Nox application-contract config
- running FastAPI agent
- live market-data reachability to CoinGecko

### Proof That The Flow Is Not Mocked

- no seeded timeline entries are shown by default
- no recommendation card renders until the live agent responds
- no policy success state appears until Nox encryption and `updatePolicyWithNox()` complete
- no session state changes appear until `openSession()` confirms
- no funding, swap execution, or settlement success appears without confirmed transactions

## NO MOCKED DATA VALIDATION CHECKLIST

- [ ] Wallet badge shows a live connected address.
- [ ] System status shows Arbitrum Sepolia readiness.
- [ ] Policy save uses a live Nox client and live contract write.
- [ ] Policy save uses the proof-backed `PolicyVault.updatePolicyWithNox()` path.
- [ ] Research ranking comes from FastAPI, not `mock-agent.ts`.
- [ ] Market signals originate from CoinGecko markets.
- [ ] Session funding, swap execution, and settlement each produce real transaction hashes.
- [ ] Timeline entries map to those real actions only.
