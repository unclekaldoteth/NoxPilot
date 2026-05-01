# NoxPilot DoraHacks Submission

## Project Summary

NoxPilot is a bounded confidential execution agent for crypto operators. The app lets a user connect an owner wallet, encrypt private policy thresholds with Nox handles, discover and rank token opportunities with a FastAPI research agent, execute one guarded ERC-20 buy on Arbitrum Sepolia, then wrap the acquired ERC-20 into a Nox confidential ERC-7984-style asset.

The core claim is intentionally scoped: the swap and wrapper deposit are public, but post-wrap balances, reveal permissions, and confidential accounting are handled through Nox handles and ACL-controlled reveal flows.

## Submission Links

Replace the placeholders below before final DoraHacks/X submission:

- Live app: `<deployed Vercel URL>`
- Research agent health: `<deployed Railway /health URL>`
- Demo video, max 4 minutes: `<public video URL>`
- GitHub repo: <https://github.com/unclekaldoteth/NoxPilot>
- DoraHacks page: <https://dorahacks.io/hackathon/vibe-coding-iexec/detail>

## Built For This Hackathon

The submitted work in this repository includes:

- Next.js guided operator UX for the judged live flow.
- FastAPI research agent with DexScreener discovery, CoinGecko market snapshots, deterministic scoring, and ChainGPT explanation when configured.
- Nox Handle integration through `packages/nox-sdk`.
- `PolicyVault`, `ExecutionGuard`, and `NoxPilotConfidentialERC20Wrapper` contracts.
- Arbitrum Sepolia deployment config for WETH, ARB, and LINK execution/wrapper lanes.
- Documentation, demo script, iExec feedback, no-mock validation checklist, and CI validation.

Open-source dependencies and sponsor SDKs are listed in `package.json`, `apps/agent/requirements.txt`, and contract imports. The project uses standard MIT-compatible app code in this repository plus external package licenses from installed dependencies.

## Current Live Arbitrum Sepolia Deployment

| Component | Address | Explorer |
|---|---|---|
| `PolicyVault` | `0xAfF2d2794cFE82f75086FD715BFd198585b69b81` | <https://sepolia.arbiscan.io/address/0xAfF2d2794cFE82f75086FD715BFd198585b69b81> |
| `ExecutionGuard` | `0xa1a12b3C04466a2480A562f9858eb4188EFB0a29` | <https://sepolia.arbiscan.io/address/0xa1a12b3C04466a2480A562f9858eb4188EFB0a29> |
| `DemoArbToken` | `0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E` | <https://sepolia.arbiscan.io/address/0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E> |
| `ARB/USDC pool` | `0xB85cf4A6d305e8c19eC476C3187db949D665C43b` | <https://sepolia.arbiscan.io/address/0xB85cf4A6d305e8c19eC476C3187db949D665C43b> |
| WETH confidential wrapper | `0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9` | <https://sepolia.arbiscan.io/address/0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9> |
| ARB confidential wrapper | `0x18C35645080A279170471b0bfCbD888946F3D674` | <https://sepolia.arbiscan.io/address/0x18C35645080A279170471b0bfCbD888946F3D674> |
| LINK confidential wrapper | `0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5` | <https://sepolia.arbiscan.io/address/0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5> |

Key deployment transactions:

- `PolicyVault`: <https://sepolia.arbiscan.io/tx/0x52e15041c72a306c06a001c23006ee56e04c6747eda771de611d28e1ce015168>
- `ExecutionGuard`: <https://sepolia.arbiscan.io/tx/0xab5ccc34303387e451467b1ef78803f3c34b30ba850b86c95406b1b095cedece>
- WETH wrapper: <https://sepolia.arbiscan.io/tx/0x0923c184c0e234ef9208995df7ef9d7a5fb9c285854e3d71f6ef767db4089bd4>
- LINK wrapper: <https://sepolia.arbiscan.io/tx/0x1092421f11bff12b10355334a706f98ec6509b47617760b0f235e975a368331a>
- ARB execution lane bootstrap: <https://sepolia.arbiscan.io/tx/0x384856dca11e7bb92ae11f474b37778c9fcfcec66c8c938bd1f715fd29df6233>
- ARB wrapper: <https://sepolia.arbiscan.io/tx/0xafba4d8efd8adc4d591410d3d4afe9c5dc2539ee5cd64bbb5a9ffaadb477b020>

## How The Project Uses iExec / Nox

- `@iexec-nox/handle`: browser-side wallet-backed encryption, handle proofs, ACL lookup, public decrypt proof, and owner reveal helpers.
- `@iexec-nox/nox-protocol-contracts`: Solidity SDK path for `Nox.fromExternal(...)`, encrypted handles, `Nox.allow(...)`, and public decrypt validation.
- `@iexec-nox/nox-confidential-contracts`: ERC-7984 confidential token contracts and the ERC-20-to-confidential-asset wrapper pattern.

## No Mocked Data Policy

The judged path must run with:

```bash
NEXT_PUBLIC_APP_MODE=live
NEXT_PUBLIC_ENABLE_DEV_MOCKS=false
```

Live proof checklist:

- [ ] Real wallet connected.
- [ ] Wallet on Arbitrum Sepolia.
- [ ] `/api/research/health` reports FastAPI reachable.
- [ ] Agent `/health` reports ChainGPT configured when presenting sponsor integration.
- [ ] `Verify live setup` succeeds against deployed contracts.
- [ ] `Encrypt & save policy on-chain` uses wallet-backed Nox handles and `PolicyVault.updatePolicyWithNox()`.
- [ ] `Trigger live research` returns `x-noxpilot-agent-source: agent`.
- [ ] Research card shows live market values and timestamps.
- [ ] `Evaluate decision` requires route, allowlist, guard, wrapper, confidence, slippage, and session checks.
- [ ] `Open bounded session on-chain` produces a transaction.
- [ ] `Execute guarded live swap` produces a transaction.
- [ ] `Wrap acquired ERC-20` produces a transaction and confidential handle metadata.
- [ ] `Reveal confidential balance` uses the Nox handle client.
- [ ] `Settle session on-chain` produces a transaction.

Dev mock fallback remains in the repo only for local development and is explicitly disabled in the judged live path.

## Demo Video Plan, Max 4 Minutes

Use this recording structure:

1. `0:00-0:25`: Explain the problem: autonomous agents should not get unlimited wallet authority, and public post-trade balances leak strategy.
2. `0:25-0:55`: Open landing page and dashboard. Show the guided `Next action` UX and live readiness checks.
3. `0:55-1:45`: Connect wallet, verify Arbitrum Sepolia, encrypt policy with Nox, and save policy on-chain.
4. `1:45-2:25`: Use the executable Arbitrum lane, trigger live research, and show ChainGPT explanation if configured.
5. `2:25-3:20`: Open bounded session, execute one guarded swap, then wrap the acquired ERC-20 into the confidential wrapper.
6. `3:20-3:50`: Reveal confidential balance as owner, show privacy boundary, and settle session.
7. `3:50-4:00`: Close with trust model: research suggests, TypeScript/contract layer enforces, Nox handles protect private policy and post-wrap accounting.

## X / Twitter Submission Draft

```text
NoxPilot for the iExec Vibe Coding Challenge:

An AI research agent can discover a token, but execution stays bounded by private Nox policy handles, an on-chain ExecutionGuard, and one-session wallet authority.

After the guarded ERC-20 buy, NoxPilot wraps the position into a Nox confidential asset so post-trade balance accounting becomes ACL-controlled.

Demo: <public demo video URL>
App: <deployed web app URL>
GitHub: https://github.com/unclekaldoteth/NoxPilot

#iExec #DoraHacks #Nox #Web3AI
```

## Final Submission Checklist

- [ ] Live web URL filled in this file and README.
- [ ] Railway agent `/health` URL filled in this file and README.
- [ ] Demo video URL filled in this file and README.
- [ ] X post published with project description, demo video, GitHub URL, and live app URL.
- [ ] `feedback.md` committed.
- [ ] `pnpm validate` passes.
- [ ] GitHub Actions CI passes on `main`.
