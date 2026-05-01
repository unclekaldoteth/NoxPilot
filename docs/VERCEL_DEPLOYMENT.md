# Vercel Deployment (apps/web)

This repo deploys the web app from `apps/web` (Next.js 15, pnpm workspace).

## 1. New Vercel Project Settings

- **Import**: `unclekaldoteth/NoxPilot`
- **Framework Preset**: `Next.js`
- **Root Directory**: `apps/web`
- **Project Name**: `noxpilot` (or `noxpilot-web`)

Build settings are already pinned in [`apps/web/vercel.json`](../apps/web/vercel.json):

- `installCommand`: `pnpm install --frozen-lockfile`
- `buildCommand`: `pnpm build`
- `devCommand`: `pnpm dev`

## 2. Environment Variables (Production / Preview)

Set these in Vercel Project Settings -> Environment Variables.

### Required for live path

```bash
NEXT_PUBLIC_APP_MODE=live
NEXT_PUBLIC_ENABLE_DEV_MOCKS=false

# Set to your deployed FastAPI agent URL (no trailing slash), e.g. https://noxpilot-agent.yourdomain.com
# AGENT_BASE_URL is server-side; NEXT_PUBLIC_AGENT_BASE_URL lets client-side readiness labels show the same target.
AGENT_BASE_URL=
NEXT_PUBLIC_AGENT_BASE_URL=

NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_POLICY_VAULT_ADDRESS=0xAfF2d2794cFE82f75086FD715BFd198585b69b81
NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS=0xa1a12b3C04466a2480A562f9858eb4188EFB0a29
NEXT_PUBLIC_DEX_ROUTER_ADDRESS=0x101F443B4d1b059569D643917553c771E1b9663E
NEXT_PUBLIC_DEX_QUOTER_ADDRESS=0x2779a0CC1c3e0E44D2542EC3e79e3864Ae93Ef0B
NEXT_PUBLIC_DEX_DEFAULT_POOL_FEE=3000
NEXT_PUBLIC_SESSION_ASSET_SYMBOL=USDC
NEXT_PUBLIC_SESSION_ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
NEXT_PUBLIC_TOKEN_ETH_ADDRESS=0x980B62Da83eFf3D4576C647993b0c1D7faf17c73
NEXT_PUBLIC_TOKEN_LINK_ADDRESS=0xb1D4538B4571d411F07960EF2838Ce337FE1E80E
NEXT_PUBLIC_TOKEN_ARB_ADDRESS=0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E

NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS=0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9
NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS=0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5
NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS=0x18C35645080A279170471b0bfCbD888946F3D674

# Optional override; if omitted the app falls back to POLICY_VAULT_ADDRESS
NEXT_PUBLIC_NOX_APPLICATION_CONTRACT_ADDRESS=0xAfF2d2794cFE82f75086FD715BFd198585b69b81
```

### Optional Nox endpoints

```bash
NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL=
NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS=
NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL=
```

### Optional (if you later add WalletConnect support)

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

## 3. If You Do Not Deploy Agent Yet

To ship UI-only quickly without a live FastAPI agent:

```bash
NEXT_PUBLIC_APP_MODE=mock
NEXT_PUBLIC_ENABLE_DEV_MOCKS=true
```

Then redeploy.

## 4. Deploy The FastAPI Agent

The web app cannot run live research or show ChainGPT as active unless the FastAPI service is public.

Fast path with Render:

1. Create a Render Blueprint from the repo root. The included [`render.yaml`](../render.yaml) points to `apps/agent`.
2. Set `AGENT_ALLOWED_ORIGINS` to your Vercel URL, for example `https://noxpilot.vercel.app`.
3. Set `CHAINGPT_API_KEY` as a secret environment variable.
4. After deploy, open `https://your-agent-url/health`.
5. Copy the base URL into Vercel as both `AGENT_BASE_URL` and `NEXT_PUBLIC_AGENT_BASE_URL`.

Docker path:

```bash
cd apps/agent
docker build -t noxpilot-agent .
docker run -p 8010:8010 --env-file .env noxpilot-agent
```

Railway path:

1. Create a Railway service from the GitHub repo.
2. Set `Root Directory` to `apps/agent`.
3. If Railway does not show config-as-code from `apps/agent/railway.json`, set the custom config path to `/apps/agent/railway.json`.
4. Keep the start command empty in the dashboard or set it to `python start.py`; the config file is the source of truth.
5. Set `CHAINGPT_API_KEY` and `AGENT_ALLOWED_ORIGINS`.
6. Generate a Railway domain and verify `/health`.

## 5. Deploy Web

Click **Deploy** in Vercel UI.

After deploy, verify:

1. `/` loads with the new logo/header branding.
2. `/demo` opens.
3. `Verify live setup` succeeds (for live mode).
4. System health shows `Research agent reachable`.
5. System health shows `ChainGPT analyst active` when `CHAINGPT_API_KEY` is set on the agent.
6. Research actions return `agent` source (not `mock`) when `AGENT_BASE_URL` is configured.
7. Copy the final web URL and agent `/health` URL into [`../SUBMISSION.md`](../SUBMISSION.md) before publishing the DoraHacks/X submission.
