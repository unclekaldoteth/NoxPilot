# NoxPilot Demo Script

## Opening Setup

Before presenting:

- start the FastAPI agent locally
- ensure the browser wallet is connected to Arbitrum Sepolia
- deploy or point to live `PolicyVault` and `ExecutionGuard`
- deploy or point to a concrete confidential wrapper for the selected ERC-20
- confirm the connected wallet is the `PolicyVault` owner and `ExecutionGuard` admin
- confirm public Nox env values are present in `apps/web/.env.local`
- confirm the selected token has route, allowlist, and wrapper config

Open:

- `/`
- `/dashboard`
- `/demo`

## 3-5 Minute Script

### 1. Problem framing

Say:

> Most autonomous trading demos blur the trust boundary. The same wallet stores capital, policies are exposed, the agent appears to have broad authority, and the resulting position stays fully public.

### 2. Landing page

Click:

- `Open demo dashboard`

Say:

> NoxPilot keeps the research agent separate from the execution authority. The wallet UX, Nox encryption, contract writes, and confidential asset reveal stay on the TypeScript side, while Python only discovers, ranks, and explains.

### 3. Dashboard overview

Point at:

- Vault Wallet
- Execution Wallet
- System Status
- Confidential Policy
- Token Discovery
- Research Agent Recommendation
- Execution Decision
- Confidential Asset or wrapped position state

Say:

> The wallet balances are live reads. The policy card only fills in after wallet-backed encryption and a real contract write. The research card only fills in after live token discovery and the FastAPI agent response. The confidential asset state appears only after the guarded buy is wrapped through a configured Nox wrapper.

### 4. Demo page

Click through:

1. `Connect wallet`
2. `Initialize live topology`
3. complete the policy form
4. `Encrypt & save policy on-chain`
5. discover token candidates by category and chain
6. `Trigger live research`
7. `Evaluate live decision`
8. `Open bounded session on-chain`
9. optionally switch to the registered execution wallet
10. `Execute bounded live swap`
11. wrap the acquired ERC-20 into a confidential asset
12. reveal the confidential balance as the owner
13. `Settle session on-chain`
14. unwrap if needed
15. `Pause system`

Say:

> This is the canonical judged path. Every visible success state comes from a real wallet action, a real agent response, a real on-chain state transition, or a Nox handle operation.

### 5. Explain the scoped execution model

Say:

> For this MVP, execution is intentionally narrow but real. We fund one live session asset into `ExecutionGuard`, prepare a confidential min-confidence approval handle from `PolicyVault`, execute one real exact-input swap through a configured router, and then wrap the acquired ERC-20 into a Nox confidential ERC-7984-style asset. The daily budget and min-confidence threshold both enter `PolicyVault` through proof-backed Nox handle paths.

Say:

> The initial swap and wrapper deposit are public transactions. NoxPilot does not claim full transaction privacy. The privacy upgrade starts after wrapping, where the resulting balance and later accounting are represented through Nox handles and owner-controlled reveal.

### 6. Research-only chain explanation

Say:

> Discovery can show Base, BNB, and Solana candidates for a stronger research experience. In v1, those are research-only unless the full execution stack exists for that chain. The confidential wrapping path is Arbitrum Sepolia-only until official NoxCompute, gateway, subgraph, SDK resolver, router, deployment, and allowlist support are confirmed.

### 7. Trust page

Open:

- `/trust`

Say:

> The unsafe model puts capital and automation into one opaque loop. NoxPilot keeps capital, policy confidentiality, execution authority, post-trade privacy, and operator revocation visibly separate.

### 8. Close

Say:

> NoxPilot gives AI bounded execution authority, then turns the acquired ERC-20 position into a confidential asset instead of leaving every post-trade balance public.

## End-to-End Live Validation

### Prerequisites

- wallet connected on Arbitrum Sepolia
- live `PolicyVault` and `ExecutionGuard`
- live concrete wrapper for the selected ERC-20
- public Nox Handle env configured
- FastAPI agent running
- live market-data providers reachable from the Python agent runtime
- selected token has route, wrapper, and allowlist config

### Proof Points During The Demo

- The app does not show a demo wallet button unless dev mocks were explicitly enabled.
- The timeline is empty until real actions occur.
- Policy save shows only after the handle path and `PolicyVault.updatePolicyWithNox()` succeed.
- Execution only proceeds after `ExecutionGuard.prepareConfidenceApproval()` and a live Handle `publicDecrypt()` proof confirm the confidential min-confidence gate.
- Research ranking shows live market numbers and timestamps.
- Base, BNB, and Solana candidates are labeled research-only unless execution and wrapper config exists.
- Session funding, swap execution, wrapping, and settlement each require a confirmed tx hash.
- Wrapped confidential position state includes the underlying token, wrapper address, chain ID, encrypted handle, ACL/reveal state, and wrap tx hash.
- Owner balance reveal uses the Nox handle client.

## Fallback Flow

Dev-only fallback exists, but it is not the judged path.

Only use it when:

- `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`
- you intentionally switch the app into mock mode

If you must mention it, say:

> Mock mode is development-only and explicitly labeled. The judged path is the live path you just saw.

## NO MOCKED DATA VALIDATION CHECKLIST

- [ ] Real wallet connected
- [ ] Arbitrum Sepolia selected
- [ ] Topology initialized against deployed contracts
- [ ] Policy encrypted through live Nox path
- [ ] Policy saved on-chain
- [ ] Recommendation returned by the live FastAPI agent
- [ ] Explanation returned by the live FastAPI agent
- [ ] Ranking inputs derived from live market rows
- [ ] Executable status requires route, allowlist, guard, and wrapper config
- [ ] Session opened through a real contract transaction
- [ ] Live swap executed through a real contract transaction
- [ ] Acquired ERC-20 wrapped through a real contract transaction
- [ ] Confidential position handle recorded
- [ ] Owner reveal performed through the Nox handle client
- [ ] Settlement recorded through a real contract transaction
- [ ] Timeline entries correspond only to those live actions
