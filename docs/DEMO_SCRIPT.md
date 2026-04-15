# NoxPilot Demo Script

## Opening Setup

Before presenting:

- start the FastAPI agent locally
- ensure the browser wallet is connected to Arbitrum Sepolia
- deploy or point to live `PolicyVault` and `ExecutionGuard`
- confirm the connected wallet is the `PolicyVault` owner and `ExecutionGuard` admin
- confirm public Nox env values are present in `apps/web/.env.local`

Open:

- `/`
- `/dashboard`
- `/demo`

## 3-5 Minute Script

### 1. Problem framing

Say:

> Most autonomous trading demos blur the trust boundary. The same wallet stores capital, policies are exposed, and the agent appears to have broad authority.

### 2. Landing page

Click:

- `Open demo dashboard`

Say:

> NoxPilot keeps the research agent separate from the execution authority. The wallet UX, Nox encryption, and contract writes stay on the TypeScript side, while Python only ranks and explains.

### 3. Dashboard overview

Point at:

- Vault Wallet
- Execution Wallet
- System Status
- Confidential Policy
- Research Agent Recommendation
- Execution Decision

Say:

> The wallet balances are live reads. The policy card only fills in after wallet-backed encryption and a real contract write. The research card only fills in after the FastAPI agent returns live data.

### 4. Demo page

Click through:

1. `Connect wallet`
2. `Initialize live topology`
3. complete the policy form
4. `Encrypt & save policy on-chain`
5. `Trigger live research`
6. `Evaluate live decision`
7. `Open bounded session on-chain`
8. optionally switch to the registered execution wallet
9. `Execute bounded live swap`
10. `Settle session on-chain`
11. `Pause system`

Say:

> This is the canonical judged path. Every visible success state comes from a real wallet action, a real agent response, or a real on-chain state transition.

### 5. Explain the scoped execution model

Say:

> For this MVP, execution is intentionally narrow but real. We fund one live session asset into `ExecutionGuard`, prepare a confidential min-confidence approval handle from `PolicyVault`, execute one real exact-input swap through a configured router, and then sweep the resulting assets back to the vault. The daily budget and min-confidence threshold both enter `PolicyVault` through proof-backed Nox handle paths.

### 6. Trust page

Open:

- `/trust`

Say:

> The unsafe model puts capital and automation into one opaque loop. NoxPilot keeps capital, policy confidentiality, execution authority, and operator revocation visibly separate.

### 7. Close

Say:

> NoxPilot gives AI bounded execution authority while keeping policy logic confidential and the user’s main capital isolated.

## End-to-End Live Validation

### Prerequisites

- wallet connected on Arbitrum Sepolia
- live `PolicyVault` and `ExecutionGuard`
- public Nox Handle env configured
- FastAPI agent running
- CoinGecko reachable from the Python agent runtime

### Proof Points During The Demo

- The app does not show a demo wallet button unless dev mocks were explicitly enabled.
- The timeline is empty until real actions occur.
- Policy save shows only after the handle path and `PolicyVault.updatePolicyWithNox()` succeed.
- Execution only proceeds after `ExecutionGuard.prepareConfidenceApproval()` and a live Handle `publicDecrypt()` proof confirm the confidential min-confidence gate.
- Research ranking shows live market numbers and timestamps.
- Session funding, swap execution, and settlement each require a confirmed tx hash.

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
- [ ] Ranking inputs derived from live CoinGecko market rows
- [ ] Session opened through a real contract transaction
- [ ] Live swap executed through a real contract transaction
- [ ] Settlement recorded through a real contract transaction
- [ ] Timeline entries correspond only to those live actions
