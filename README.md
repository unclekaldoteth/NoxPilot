# NoxPilot

NoxPilot is a hybrid hackathon MVP for confidential, bounded crypto execution.

- TypeScript / Next.js owns wallet UX, Nox Handle encryption, contract interaction, execution orchestration, and the operator dashboard.
- Python / FastAPI owns research ranking, explanation, and live market-data ingestion.
- Solidity defines the bounded session-control layer through `PolicyVault` and `ExecutionGuard`.

The judged/demo path is now live by default:

- real wallet connection
- Arbitrum Sepolia contract reads and writes
- wallet-backed Nox Handle encryption
- live FastAPI research responses
- live fetched market inputs
- real on-chain session open / guarded swap execution / settlement sweep

## Why Hybrid

The split is deliberate:

- TypeScript keeps wallet control, contract writes, and privacy-sensitive policy handling on the web3-native side.
- Python stays focused on ranking, explanation, and live market-data processing without ever touching wallet authority.

That boundary is the trust model.

## Repo Structure

```text
/apps
  /web        Next.js 15 operator console and judged demo surface
  /agent      FastAPI research agent with live market-data fetches
/contracts    Foundry contracts for session control and execution guardrails
/packages
  /shared     Shared schemas, constants, and dev-only mock data
  /nox-sdk    Wrapper around @iexec-nox/handle
  /ui         Reusable UI primitives
/docs         PRD, architecture, and demo script
```

## Local Setup

### 1. Install JS dependencies

```bash
pnpm install
pnpm build:nox-sdk
```

### 2. Configure env

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/agent/.env.example apps/agent/.env
cp contracts/.env.example contracts/.env
```

If you only want to deploy the contracts, `contracts/.env` is enough. The shipped template now pre-fills the public Arbitrum Sepolia RPC, Circle test USDC, and Uniswap Arbitrum Sepolia router so you only need to add `PRIVATE_KEY`, `OWNER_ADDRESS`, and `EXECUTION_WALLET_ADDRESS`.

Required live env values:

- `NEXT_PUBLIC_AGENT_BASE_URL`
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_POLICY_VAULT_ADDRESS`
- `NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS`
- `NEXT_PUBLIC_DEX_ROUTER_ADDRESS`
- `NEXT_PUBLIC_DEX_QUOTER_ADDRESS`
- `NEXT_PUBLIC_SESSION_ASSET_ADDRESS`
- `NEXT_PUBLIC_TOKEN_ETH_ADDRESS`
- `NEXT_PUBLIC_TOKEN_ARB_ADDRESS`
- `NEXT_PUBLIC_TOKEN_LINK_ADDRESS`
- `NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS`

Optional Nox override values:

- `NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL`
- `NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL`

Dev-only fallback:

- `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`
- `NEXT_PUBLIC_APP_MODE=mock`

### 3. Start the Python research agent

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/agent/requirements.txt
cd apps/agent
python -m uvicorn main:app --reload
```

### 4. Build or deploy the contracts

```bash
cd contracts
forge build
forge test -vv
set -a
source .env
set +a
forge script script/Deploy.s.sol:Deploy --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" --broadcast -vv
```

### 5. Start the web app

```bash
pnpm dev:web
```

## Canonical Live Demo Flow

1. Open `/demo`.
2. Connect the wallet that owns the deployed `PolicyVault` and administers `ExecutionGuard`.
3. Confirm the wallet is on Arbitrum Sepolia.
4. Click `Initialize live topology`.
5. Fill the policy form and click `Encrypt & save policy on-chain`.
6. Click `Trigger live research`.
7. Click `Evaluate live decision`.
8. Click `Open bounded session on-chain`.
9. Optionally switch to the registered execution wallet if you want to demonstrate delegated execution instead of owner-driven execution.
10. Click `Execute bounded live swap`.
11. Click `Settle session on-chain`.
12. Optionally click `Pause system` or `Revoke execution session`.

## What Is Real vs Limited

Fully live in the default judged path:

- wallet connection and network verification
- contract reads from `PolicyVault` and `ExecutionGuard`
- contract writes for topology init, policy save, session open, guarded swap execution, settlement, and pause
- Nox handle encryption through a wallet-backed TS client
- on-chain validation of the confidential daily-budget and min-confidence handles through `PolicyVault.updatePolicyWithNox()`
- FastAPI `/health`, `/research/rank`, and `/research/explain`
- live market data fetched by the Python agent from CoinGecko markets
- real session-asset funding into `ExecutionGuard`
- real exact-input guarded swap execution through the configured router
- real settlement sweeps back to the vault owner
- dashboard state derived from live wallet + contract + agent responses
- timeline entries created only from successful live actions or live agent responses

Real but intentionally scoped:

- the swap path is intentionally narrow: one exact-input route, one configured router, one configured session asset
- the confidential daily-budget and min-confidence fields are validated through the Nox proof path, while the remaining thresholds still stay as handle references plus off-chain bounded decisioning
- session budgets are still tracked on-chain in USD-denominated control values, while the swap itself uses the configured session asset and real token balances

Dev-only fallback:

- mock mode remains available only when `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`
- mock research and mock encryption are never the default path

## End-to-End Live Validation

### Prerequisites

- MetaMask or another injected wallet
- Arbitrum Sepolia selected in the wallet
- deployed `PolicyVault` and `ExecutionGuard`
- configured router, quoter, session-asset, and token addresses
- the connected wallet must be the `PolicyVault.owner()` and `ExecutionGuard.admin()`
- after session funding, you may switch to the registered `executionWallet()` to demonstrate delegated execution and settlement without changing the configured topology
- `NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS` must point to the live application contract used by the Handle client
- Python agent must be running at `NEXT_PUBLIC_AGENT_BASE_URL`

### Market Data Dependency

The research agent fetches live market data from the CoinGecko markets endpoint:

- `GET https://api.coingecko.com/api/v3/coins/markets`

The scoring heuristics are simple, but the inputs are live: current price, 24h price change, total volume, market-cap rank, and intraday range.

### Proof Points

- The wallet badge shows the connected live address, not a demo wallet.
- The system status card reports whether contracts and Nox config are actually ready.
- The confidential policy card shows handle references only after wallet-backed encryption succeeds and the Nox-proofed policy write confirms.
- The execution flow prepares a confidential confidence-approval handle before the swap and only proceeds after the live Handle gateway returns a valid boolean proof.
- The research card shows live source metadata and live market numbers.
- Session funding, swap execution, and settlement each require real Arbitrum Sepolia transactions.
- The activity timeline stays empty until real actions or live agent responses occur.

## NO MOCKED DATA VALIDATION CHECKLIST

- [ ] A real wallet is connected.
- [ ] The wallet is on Arbitrum Sepolia.
- [ ] `PolicyVault` and `ExecutionGuard` addresses are configured and reachable.
- [ ] `Initialize live topology` succeeds against the deployed contracts.
- [ ] `Encrypt & save policy on-chain` succeeds through the wallet-backed Nox path.
- [ ] The saved policy appears from real chain state, not seeded dashboard defaults.
- [ ] `Trigger live research` returns a live FastAPI response.
- [ ] The research payload contains live market fields such as price, volume, or observed timestamp.
- [ ] `Evaluate live decision` uses the live recommendation and current session state.
- [ ] `Open bounded session on-chain` produces a real transaction.
- [ ] `Execute bounded live swap` produces a real transaction.
- [ ] `Settle session on-chain` produces a real transaction.
- [ ] Timeline entries correspond only to those live actions or live agent responses.

## Limitations

- The live execution path is intentionally narrow: one exact-input swap route, one configured router, and one configured session asset.
- The daily-budget and min-confidence fields now use the Nox proof path; deeper confidential execution checks such as slippage remain future work.
- The research agent depends on live market-data availability from CoinGecko.
- Wallet balance USD estimates and settlement USD summaries depend on live market snapshots from the agent path.

## Helpful Commands

```bash
pnpm build:nox-sdk
pnpm --filter @noxpilot/web exec tsc --noEmit
pnpm --filter @noxpilot/web build
python3 -m py_compile apps/agent/main.py apps/agent/schemas.py apps/agent/services/*.py
cd contracts && forge build && forge test -vv
```
