# NoxPilot Architecture

## System Overview

NoxPilot has four execution domains:

1. `apps/web`: Next.js operator console and judged demo path
2. `apps/agent`: FastAPI research engine fed by live market data
3. `packages/*`: shared schemas, Nox wrapper, and UI primitives
4. `contracts`: Foundry contracts for bounded session control and confidential wrapper integration

The v1 product path is intentionally narrow: discover and research a token, execute one bounded ERC-20 buy on Arbitrum Sepolia Testnet, then wrap the acquired ERC-20 into a Nox confidential ERC-7984-style asset.

The operator UX now mirrors that path explicitly:

- `/` frames the full 3-minute story: connect wallet, discover token, bounded swap, wrap confidentially
- `/dashboard` is a read-only monitoring surface with a shared `Next action` banner that routes operators back into the guided demo
- `/demo` is a progressive three-phase flow: `Connect & Verify`, `Set Policy & Research`, and `Execute & Close`
- readiness includes the web contract config, FastAPI `/health`, ChainGPT configuration, Nox config, wrappers, and session-asset balances

## Current Live Deployment

Arbitrum Sepolia Testnet snapshot updated April 29, 2026:

- `PolicyVault`: `0xAfF2d2794cFE82f75086FD715BFd198585b69b81`
- `ExecutionGuard`: `0xa1a12b3C04466a2480A562f9858eb4188EFB0a29`
- Demo ARB token: `0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E`
- ARB/USDC pool: `0xB85cf4A6d305e8c19eC476C3187db949D665C43b`
- WETH wrapper: `0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9`
- ARB wrapper: `0x18C35645080A279170471b0bfCbD888946F3D674`
- LINK wrapper: `0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5`

As deployed today, the full live confidential execution path is available for WETH, ARB, and LINK.

## Trust Boundary

The core trust model is unchanged:

- the Python agent discovers, ranks, and explains
- the TypeScript layer decides, executes, wraps, and reveals
- the vault wallet remains distinct from the execution role
- Nox Handle encryption stays in TypeScript, not Python
- bounded swap execution stays separate from confidential asset wrapping

The research service never gets spending authority. It can produce candidate sets and rationale, but executable status is assigned only by the TypeScript and contract configuration layer.

## Canonical Live Path

```text
Connected wallet
  -> Arbitrum Sepolia Testnet network check
  -> PolicyVault / ExecutionGuard / wrapper reads
  -> wallet-backed @iexec-nox/handle encryption
  -> PolicyVault.updatePolicyWithNox()
  -> ExecutionGuard.syncPolicyWhitelistRoot()
  -> ExecutionGuard.setAllowedToken()
  -> ExecutionGuard.setAllowedTokenAddress()
  -> register supported ERC-20 wrapper config

Web app
  -> /api/research/health
  -> FastAPI /health
  -> agent + ChainGPT readiness state
  -> /api/research/market-snapshot
  -> FastAPI /research/market-snapshot
  -> live CoinGecko market snapshots
  -> /api/research/discover
  -> DexScreener / discovery provider
  -> /api/research/rank
  -> FastAPI /research/rank
  -> live market rows
  -> ranked live recommendation
  -> ChainGPT explanation when configured

TypeScript execution layer
  -> evaluate live recommendation against policy + current contract state
  -> require supported chain, token, route, ExecutionGuard, and wrapper config
  -> PolicyVault.openSession()
  -> approve session asset
  -> ExecutionGuard.fundSessionAsset()
  -> ExecutionGuard.prepareConfidenceApproval()
  -> Handle client publicDecrypt(confidenceApprovalHandle)
  -> live quoter read
  -> ExecutionGuard.executeExactInputSingle()
  -> ExecutionGuard approves configured ERC20ToERC7984Wrapper
  -> ERC20ToERC7984Wrapper.wrap(owner, amountOut)
  -> record encrypted confidential position handle
  -> owner reveal through @iexec-nox/handle ACL/decrypt path
  -> optional unwrap request/finalize flow
  -> ExecutionGuard.settleSessionAssets()

Dashboard / timeline
  -> render live wallet state
  -> render live contract state
  -> render live research payloads
  -> render confidential position metadata
  -> compute shared next-action state for dashboard and demo
  -> keep dashboard read-only and move live actions into the guided demo surface
  -> append only real actions and real agent responses
  -> persist current demo run state in localStorage for refresh-safe judging
```

## UX Flow Model

The frontend now uses a shared operator-flow model rather than exposing every control equally.

- a shared `Next action` banner summarizes the current live task on `/dashboard` and `/demo`
- the guided demo reveals only the current actionable step and collapses future work until prerequisites are met
- the dashboard keeps the same live state cards but no longer presents itself as an action surface
- mobile uses a compact progress view with a `See all steps` toggle instead of a long always-open checklist
- system health shows plain-language fixes for wallet, network, contracts, topology, Nox config, agent reachability, ChainGPT, and paused trading

This matters architecturally because the UI now reflects the real execution boundary more honestly: monitoring lives on the dashboard, live writes live in the guided demo, and both surfaces derive their guidance from the same app state.

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
- approves the configured confidential wrapper after receiving supported ERC-20 output
- calls the wrapper only after the same bounded-session and allowlist checks have passed
- sweeps session assets back to the vault owner on settlement

### `ConfidentialAssetWrapper`

- is a separate layer from `ExecutionGuard`
- uses thin concrete wrappers around `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts@0.1.0`
- locks an allowlisted underlying ERC-20 and mints or updates a confidential ERC-7984-style balance
- exposes confidential balance handles for owner reveal through the Nox handle client
- supports unwrap request and finalize flows according to the wrapper contract model
- rejects unsupported wrappers, unsupported chains, and unsafe token mechanics such as fee-on-transfer tokens unless explicitly handled by a custom wrapper

## Research Agent Data Flow

The default path no longer uses synthetic market signals.

- discovery can search by category and chain, such as meme tokens on Base, BNB, or Solana
- the web app can inject an `Executable Arbitrum Testnet Lane` candidate set for WETH, ARB, and LINK when the live token and wrapper envs are present
- discovered Base, BNB, and Solana candidates are research-only unless the full execution and Nox wrapper configuration exists
- `apps/agent/services/market_data.py` fetches live market rows
- `apps/agent/services/scoring.py` transforms live price, volume, rank, liquidity, and activity into heuristic signals
- `/research/market-snapshot` exposes live market snapshots for inspection
- `/research/rank` returns a ranked shortlist plus a best candidate
- `/research/explain` explains the live-ranked candidate, using ChainGPT when configured
- `/health` reports market-data source, discovery source, ChainGPT provider/model, and whether the server-side ChainGPT key is configured without exposing the key

The heuristics are lightweight. The inputs are live.

## Nox Integration Boundary

`packages/nox-sdk` is the integration boundary for `@iexec-nox/handle`.

- live mode requires a wallet-backed viem client
- the application contract address is supplied from env
- the web provider encrypts policy values on the client side before writing handle references on-chain
- owner reveal uses handle ACL/decrypt helpers rather than Python-side secret handling
- server-side mock encryption is isolated behind explicit dev-mock opt-in only

Nox package responsibilities:

- `@iexec-nox/handle`: client encryption, decryption, ACL lookup, and public decrypt proof flows
- `@iexec-nox/nox-protocol-contracts`: Solidity SDK, encrypted handles, proof validation, and TEE-backed Nox operations
- `@iexec-nox/nox-confidential-contracts`: ERC-7984 confidential token contracts and `ERC20ToERC7984Wrapper`

NoxPilot intentionally uses the Nox Protocol TEE-based ERC-7984 implementation. It does not use Zama/FHE ERC-7984 contracts or an OpenZeppelin ERC-7984 implementation. The OpenZeppelin imports in the wrapper are limited to ERC-20 interfaces, SafeERC20, metadata, and IERC165 support around the Nox confidential wrapper.

The contracts still store references for some fields, not full confidential proof verification everywhere. The daily-budget and min-confidence fields are the real Nox-native confidential policy path: they are encrypted with `@iexec-nox/handle`, submitted with handle proofs, validated in `PolicyVault`, and used to prepare an on-chain confidence-approval handle before execution.

The confidential asset path begins after the public swap. The wrapper deposit is public, but the post-wrap balance and later confidential accounting use Nox handles and ACL-controlled reveal.

## Live-by-Default Runtime Rules

- `NEXT_PUBLIC_APP_MODE=live` is the default
- missing live config produces an honest error, not a fake success state
- mock mode only appears when `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`
- research API routes call the live agent first and only use mock payloads in explicit dev mode
- recommendations are executable only when chain, token, DEX route, `ExecutionGuard`, and wrapper config are all present and allowlisted
- `pnpm validate` and GitHub Actions run web typecheck/build, agent compile/unit tests, Foundry tests, and a basic secret scan

## What Remains Intentionally Scoped

- the live trading path is intentionally one exact-input swap route, not a generic DEX aggregation engine
- only the daily-budget and min-confidence policy fields are validated through the Nox proof path on-chain
- v1 confidential wrapping is Arbitrum Sepolia Testnet only
- the currently deployed live wrapper set is WETH, ARB, and LINK
- Base and BNB remain future execution expansion until official NoxCompute, gateway, subgraph, Solidity SDK resolver, contract deployment, router, and token allowlist support are available
- Solana remains research-only unless a separate Solana wallet, program, routing, and confidential execution path is built
- the first acquired amount may be observable from public swap and wrapper transactions
- wallet balances are real; session budgets remain live USD-denominated control values alongside the session-asset accounting
- funding decisions now use the configured USDC session-asset balance, while native ETH remains visible as gas capacity

That is smaller than a full trading stack, but it is real and aligned with the product boundary.

## End-to-End Live Validation

### Required Components

- owner/admin wallet connected in the browser
- Arbitrum Sepolia Testnet RPC
- deployed `PolicyVault`
- deployed `ExecutionGuard`
- deployed concrete confidential wrapper for the selected ERC-20
- today, that means WETH, ARB, or LINK on the live deployment
- public Nox application-contract config
- running FastAPI agent
- configured `NEXT_PUBLIC_AGENT_BASE_URL` or server-side `AGENT_BASE_URL`
- configured `CHAINGPT_API_KEY` when the demo should show ChainGPT active instead of local fallback
- live market-data reachability

### Proof That The Flow Is Not Mocked

- no seeded timeline entries are shown by default
- no recommendation card renders until the live agent responds
- no executable recommendation appears without route, guard, and wrapper config
- no policy success state appears until Nox encryption and `updatePolicyWithNox()` complete
- no session state changes appear until `openSession()` confirms
- no funding, swap execution, wrapping, reveal, or settlement success appears without confirmed transactions or handle operations

## NO MOCKED DATA VALIDATION CHECKLIST

- [ ] Wallet badge shows a live connected address.
- [ ] System status shows Arbitrum Sepolia Testnet readiness.
- [ ] Policy save uses a live Nox client and live contract write.
- [ ] Policy save uses the proof-backed `PolicyVault.updatePolicyWithNox()` path.
- [ ] Research ranking comes from FastAPI, not `mock-agent.ts`.
- [ ] System health shows FastAPI reachable and ChainGPT configured.
- [ ] Market signals originate from live market-data providers.
- [ ] Executable status requires supported chain, route, token, guard, and wrapper config.
- [ ] Session funding, swap execution, wrapping, and settlement each produce real transaction hashes.
- [ ] Confidential position state includes wrapper address, chain ID, encrypted handle, ACL/reveal state, and wrap tx hash.
- [ ] Owner reveal uses the Nox handle client rather than Python-side secret handling.
- [ ] Timeline entries map to those real actions only.
