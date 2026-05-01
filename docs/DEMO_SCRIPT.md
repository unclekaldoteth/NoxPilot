# NoxPilot Demo Script

## Opening Setup

Before presenting:

- start the FastAPI agent locally or confirm the deployed `NEXT_PUBLIC_AGENT_BASE_URL`
- confirm `/health` reports `chain_gpt.configured=true` when showing ChainGPT sponsor integration
- ensure the browser wallet is connected to Arbitrum Sepolia
- deploy or point to live `PolicyVault` and `ExecutionGuard`
- deploy or point to a concrete confidential wrapper for the selected ERC-20
- confirm the connected wallet is the `PolicyVault` owner and `ExecutionGuard` admin
- confirm public Nox env values are present in `apps/web/.env.local`
- confirm the selected token has route, allowlist, and wrapper config
- for the current live deployment, use WETH, ARB, or LINK for the full confidential path

Open:

- `/`
- `/dashboard`
- `/demo`

## DoraHacks Submission Recording

Keep the public demo video under 4 minutes.

Before recording:

- set `NEXT_PUBLIC_APP_MODE=live`
- set `NEXT_PUBLIC_ENABLE_DEV_MOCKS=false`
- confirm the web app URL is public
- confirm the FastAPI agent `/health` URL is public
- confirm `/health` reports ChainGPT configured when presenting the ChainGPT sponsor path
- prefer WETH or LINK for the cleanest live wrapper story; ARB is supported but uses the repo's deployed testnet `DemoArbToken`

Record these proof points:

- live wallet address and Arbitrum Sepolia network
- `Verify live setup` succeeding against deployed contracts
- Nox policy encryption and `PolicyVault.updatePolicyWithNox()`
- FastAPI research result with live market timestamp
- ChainGPT provider badge when configured
- guarded swap transaction
- confidential wrapper transaction
- owner-only reveal through the Nox handle client
- settlement transaction

After recording, update `SUBMISSION.md` with the live app URL, agent health URL, and video URL.

## Current Live Deployment

Arbitrum Sepolia snapshot updated April 29, 2026:

- `PolicyVault`: `0xAfF2d2794cFE82f75086FD715BFd198585b69b81`
- `ExecutionGuard`: `0xa1a12b3C04466a2480A562f9858eb4188EFB0a29`
- Demo ARB token: `0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E`
- ARB/USDC pool: `0xB85cf4A6d305e8c19eC476C3187db949D665C43b`
- WETH wrapper: `0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9`
- ARB wrapper: `0x18C35645080A279170471b0bfCbD888946F3D674`
- LINK wrapper: `0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5`

For a fully live wrap-and-reveal demo today, you can use WETH, ARB, or LINK.

## 3-5 Minute Script

### 1. Problem framing

Say:

> Most autonomous trading demos blur the trust boundary. The same wallet stores capital, policies are exposed, the agent appears to have broad authority, and the resulting position stays fully public.

### 2. Landing page

Click:

- `Open guided demo`

Say:

> NoxPilot now tells the operator exactly what happens next. The landing page frames the whole journey in one sentence: connect the owner wallet, discover the best candidate, execute one bounded swap, then wrap the result into a confidential asset.

### 3. Dashboard overview

Point at:

- the `Next action` banner
- System Health, including research agent and ChainGPT readiness
- Vault Wallet
- Execution Wallet
- System Status
- Confidential Policy
- Research Agent Recommendation
- Execution Decision
- Confidential Asset or wrapped position state

Say:

> The dashboard is intentionally read-only. It is there to summarize readiness, balances, research, decision state, and the confidential position. Every action routes back into the guided demo so the operator always has one clear next step.

Say:

> The wallet balances are live reads, including the USDC session-asset balance used for funding. The policy card only fills in after wallet-backed encryption and a real contract write. The research card only fills in after executable-lane selection or live token discovery and the FastAPI agent response. The confidential asset state appears only after the guarded buy is wrapped through a configured Nox wrapper.

### 4. Demo page

Click through:

1. show the `Next action` banner
2. in `Connect & Verify`, click `Connect wallet`
3. click `Verify live setup`
4. in `Set Policy & Research`, complete the policy form
5. `Encrypt & save policy on-chain`
6. choose `Use Executable Arbitrum Lane` for WETH/ARB/LINK, or discover research-only Base/BNB/Solana candidates by category and chain
7. `Trigger live research`
8. `Evaluate decision`
9. in `Execute & Close`, `Open bounded session on-chain`
10. optionally switch to the registered execution wallet
11. `Execute guarded live swap`
12. wrap the acquired ERC-20 into a confidential asset
13. reveal the confidential balance as the owner
14. `Settle session on-chain`
15. unwrap if needed
16. show `Emergency Controls` and, if needed, `Pause system`

Say:

> This is the canonical judged path. The UI no longer dumps the entire system at once. It keeps only the current step expanded, collapses future phases until they unlock, and uses the same next-action logic on desktop and mobile.

Say:

> The executable lane is deliberately separate from broader discovery. WETH, ARB, and LINK can move through the live Arbitrum Sepolia execution and wrapper path. Base, BNB, and Solana candidates make research more interesting, but stay clearly labeled as research-only unless the full deployment stack exists.

### 5. Explain the scoped execution model

Say:

> For this MVP, execution is intentionally narrow but real. We fund one live session asset into `ExecutionGuard`, prepare a confidential min-confidence approval handle from `PolicyVault`, execute one real exact-input swap through a configured router, and then wrap the acquired ERC-20 into a Nox confidential ERC-7984-style asset. The daily budget and min-confidence threshold both enter `PolicyVault` through proof-backed Nox handle paths.

Say:

> The initial swap and wrapper deposit are public transactions. NoxPilot does not claim full transaction privacy. The privacy upgrade starts after wrapping, where the resulting balance and later accounting are represented through Nox handles and owner-controlled reveal.

### 6. Research-only chain explanation

Say:

> Discovery can show Base, BNB, and Solana candidates for a stronger research experience. In v1, those are research-only unless the full execution stack exists for that chain. The confidential wrapping path is Arbitrum Sepolia-only until official NoxCompute, gateway, subgraph, SDK resolver, router, deployment, and allowlist support are confirmed.

### 6.5 ChainGPT proof point

Point at:

- System Health `ChainGPT analyst active`
- Research Agent provider badge

Say:

> The numeric score stays deterministic in Python so execution-critical inputs are stable. ChainGPT is used as the Web3 analyst layer for the operator-facing explanation. If the API key is missing, the UI labels the local fallback instead of pretending ChainGPT was used.

### 7. Trust page

Open:

- `/trust`

Say:

> The unsafe model puts capital and automation into one opaque loop. NoxPilot keeps capital, policy confidentiality, execution authority, post-trade privacy, and operator revocation visibly separate.

### 8. Close

Say:

> NoxPilot gives AI bounded execution authority, then turns the acquired ERC-20 position into a confidential asset instead of leaving every post-trade balance public.

## X / Twitter Submission

Use the draft in `SUBMISSION.md`. It already includes the project description, GitHub link, and placeholders for the video and live app URLs required for final submission.

## End-to-End Live Validation

### Prerequisites

- wallet connected on Arbitrum Sepolia
- live `PolicyVault` and `ExecutionGuard`
- live concrete wrapper for the selected ERC-20
- the current live wrapper set covers WETH, ARB, and LINK
- public Nox Handle env configured
- FastAPI agent running
- `CHAINGPT_API_KEY` configured on the agent if presenting the ChainGPT integration
- live market-data providers reachable from the Python agent runtime
- selected token has route, wrapper, and allowlist config

### Proof Points During The Demo

- The app does not show a demo wallet button unless dev mocks were explicitly enabled.
- The home page clearly states the operator journey: connect, discover, bounded swap, wrap confidentially.
- The dashboard is visibly read-only and offers `Continue in Demo` instead of mixed action controls.
- The demo page is grouped into `Connect & Verify`, `Set Policy & Research`, and `Execute & Close`.
- The `Next action` banner changes as the live flow progresses.
- System health shows FastAPI reachable and ChainGPT active.
- The executable Arbitrum lane is separate from research-only discovery.
- The timeline is empty until real actions occur.
- Policy save shows only after the handle path and `PolicyVault.updatePolicyWithNox()` succeed.
- Execution only proceeds after `ExecutionGuard.prepareConfidenceApproval()` and a live Handle `publicDecrypt()` proof confirm the confidential min-confidence gate.
- Research ranking shows live market numbers and timestamps.
- Research explanation shows ChainGPT provider/model when configured, or an explicit local fallback warning.
- Base, BNB, and Solana candidates are labeled research-only unless execution and wrapper config exists.
- Session funding, swap execution, wrapping, and settlement each require a confirmed tx hash.
- Wrapped confidential position state includes the underlying token, wrapper address, chain ID, encrypted handle, ACL/reveal state, and wrap tx hash.
- The confidential proof panel links wrapper and wrap transaction state and explains that swap/deposit are public while post-wrap balance state is confidential.
- Current research, decision, confidential position, settlement, and timeline state survive browser refresh through local persistence.
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
- [ ] ChainGPT active shown when `CHAINGPT_API_KEY` is configured
- [ ] Ranking inputs derived from live market rows
- [ ] Executable Arbitrum lane used for live swap candidates
- [ ] Executable status requires route, allowlist, guard, and wrapper config
- [ ] Session opened through a real contract transaction
- [ ] Live swap executed through a real contract transaction
- [ ] Acquired ERC-20 wrapped through a real contract transaction
- [ ] Confidential position handle recorded
- [ ] Owner reveal performed through the Nox handle client
- [ ] Settlement recorded through a real contract transaction
- [ ] Timeline entries correspond only to those live actions
