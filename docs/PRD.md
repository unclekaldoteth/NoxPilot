# NoxPilot Product Requirements Document

## 1. Product Overview

NoxPilot is a confidential multi-agent crypto execution MVP designed for hackathon evaluation. It separates capital storage from day-to-day execution, keeps policy thresholds private with Nox handle abstractions, and grants AI only bounded operational authority. The user's primary capital remains in a vault wallet while a dedicated execution wallet handles limited-session execution under revocable controls.

The strongest v1 product story is now: the agent discovers and researches an ERC-20 opportunity, executes one bounded buy through `ExecutionGuard`, then converts the acquired ERC-20 position into a Nox confidential ERC-7984-style asset. This means NoxPilot does not stop at "AI made a safe swap"; it demonstrates a post-trade privacy upgrade where the resulting position can be represented by encrypted Nox handles and revealed only through explicit ACL-controlled flows.

V1 execution and confidential wrapping are scoped to Arbitrum Sepolia. Base, BNB, and Solana discovery can improve recommendations, but they remain research-only or future execution lanes until official NoxCompute, gateway, subgraph, Solidity SDK resolver, router, deployment, and allowlist support are confirmed for those environments.

## 2. Problem Statement

Most autonomous crypto agent demos collapse trust boundaries:

- the same wallet both stores capital and executes transactions
- policy thresholds are visible or handled loosely
- AI appears to have broad spending authority
- operator revocation is unclear
- acquired positions remain fully public after execution

This creates an unacceptable trust model for users who want automation without surrendering full control or exposing every post-trade portfolio state.

NoxPilot addresses that gap by introducing:

- wallet separation
- bounded session funding
- confidential policy handling
- explicit execution guardrails
- post-buy confidential asset wrapping
- clear operator pause and revoke controls

## 3. Target Users

- crypto-native operators who want partial automation without exposing full treasury risk
- DAOs and funds evaluating bounded agent execution workflows
- hackathon judges assessing architecture, privacy posture, and trust minimization
- developers exploring confidential policy execution with hybrid TypeScript and Python services
- builders evaluating how Nox confidential assets can compose with agentic DeFi workflows

## 4. MVP Scope

In scope:

- vault and execution wallet model
- confidential policy setup and encrypted handle summary
- category and chain-based token discovery for richer research inputs
- research agent that ranks token opportunities
- execution decision engine in TypeScript
- one bounded live exact-input swap per session on Arbitrum Sepolia
- post-buy confidential wrapping of the acquired ERC-20 position on Arbitrum Sepolia
- confidential position metadata, reveal state, and owner-only balance reveal flow
- activity log, trust page, and polished dashboard UX
- Solidity skeletons for policy, execution guard, and confidential wrapper integration with one real guarded swap path
- live judged flow with explicit dev-only mock fallback

Out of scope:

- full production wallet custody
- multi-DEX route optimization
- persistent database-backed history
- audited production confidential smart contract logic
- guaranteed market alpha
- full private trading or hidden swap execution
- multi-chain confidential asset execution across Base, BNB, or Solana
- Solana swap execution through the current EVM contracts

## 5. Architecture Summary

NoxPilot is intentionally hybrid:

- Next.js + TypeScript handles wallet UX, policy configuration, Nox handle wrapping, contract orchestration, bounded execution logic, and confidential position reveal UX.
- FastAPI + Python handles research scoring, signal ranking, rationale generation, and live market intelligence ingestion.
- Solidity provides realistic bounded-execution contracts that store policy references, validate the confidential daily-budget handle path, manage session state, enforce one guarded swap route, and integrate with a separate confidential asset wrapper layer.

The boundary is strict:

- the frontend calls internal Next.js routes or the FastAPI service for research output
- FastAPI returns discovery, ranking, and explanation payloads only
- TypeScript evaluates confidential policy thresholds and decides whether execution is allowed
- wallet logic, Nox handle logic, wrapping orchestration, and reveal UX stay on the TypeScript side
- `ExecutionGuard` remains responsible for bounded swaps and session enforcement
- `ConfidentialAssetWrapper` remains a separate post-buy layer responsible for converting acquired ERC-20 output into a confidential asset

## 6. Wallet Model

- `Vault Wallet`: primary capital wallet, meant to retain the majority of funds.
- `Execution Wallet`: separate operational wallet receiving only session-scoped funding.
- session funding is explicit and revocable
- settlement closes the bounded session and records the returned budget on-chain
- post-buy wrapping can mint the confidential position to the owner while preserving the execution wallet as the operational actor

This keeps main capital isolated from operational execution while allowing the resulting position to move into a private accounting model.

## 7. Agent Model

- `Agent A`: Python research agent that discovers and ranks token opportunities from live market inputs.
- `Agent B`: TypeScript execution layer that checks the recommendation against confidential policy thresholds, wrapper availability, and operational constraints.

Agent B is the authority boundary. Research does not directly trigger spending, and wrapping only happens after the TypeScript layer confirms that the token, chain, DEX route, `ExecutionGuard`, and wrapper configuration are all supported and allowlisted.

## 8. Nox Integration Role

NoxPilot uses a dedicated TypeScript wrapper package around `@iexec-nox/handle` and Nox Solidity packages to keep the privacy boundary coherent.

Package roles:

- `@iexec-nox/handle`: client-side encryption, decryption, ACL lookup, and public decrypt proof flows for Nox handles.
- `@iexec-nox/nox-protocol-contracts`: Nox Solidity SDK primitives, encrypted handle types, proof validation, and TEE-backed operations used by contracts.
- `@iexec-nox/nox-confidential-contracts`: ERC-7984 confidential token contracts and `ERC20ToERC7984Wrapper` patterns for transforming ERC-20 assets into confidential assets.

V1 should use `@iexec-nox/nox-confidential-contracts@0.1.0` and create a thin concrete wrapper around `ERC20ToERC7984Wrapper` for each supported underlying ERC-20. The current Nox Solidity SDK resolver path is treated as Arbitrum Sepolia-only for v1; additional chains must not be marked executable until NoxCompute support and app config are verified.

This preserves a credible integration story without claiming full transaction privacy in the MVP.

References:

- [iExec docs](https://docs.iex.ec/)
- [`@iexec-nox/handle`](https://www.npmjs.com/package/@iexec-nox/handle)
- [`@iexec-nox/nox-protocol-contracts`](https://www.npmjs.com/package/@iexec-nox/nox-protocol-contracts)
- [`@iexec-nox/nox-confidential-contracts`](https://www.npmjs.com/package/@iexec-nox/nox-confidential-contracts)

## 9. Confidential Asset Flow

The post-buy confidential flow is:

1. `ExecutionGuard` executes a bounded exact-input swap and receives the ERC-20 output.
2. `ExecutionGuard` approves the configured confidential wrapper for `amountOut`.
3. `ExecutionGuard` calls `wrap(owner, amountOut)` on the concrete `ERC20ToERC7984Wrapper` implementation.
4. The wrapper locks the underlying ERC-20 and mints or updates the owner's confidential ERC-7984-style balance.
5. The app records the encrypted balance or amount handle returned by the wrapper path.
6. The owner can reveal the confidential balance through the Nox handle client if ACL permits.
7. The owner can later request and finalize unwrap according to the wrapper contract flow.

Confidential position metadata should include:

- underlying token symbol, address, and decimals
- wrapper address
- chain ID
- encrypted balance or amount handle
- viewer and ACL state
- wrap transaction hash
- reveal status and decrypted balance when available to the owner

A recommendation is executable only when all of the following are present:

- supported chain
- token allowlist entry
- DEX route and router/quoter config
- deployed `ExecutionGuard`
- deployed wrapper for the underlying ERC-20
- valid Nox app configuration for the chain
- confidence, budget, slippage, and session checks pass

Privacy boundary:

- the DEX swap transaction is public
- the wrapper deposit transaction is public
- the initial acquired amount may be inferable from swap and wrap events
- post-wrap balances, transfers, and accounting are confidential through Nox handles and ACL-controlled reveal paths

## 10. Feature List

- polished landing page with product story
- landing page framed around the operator journey: connect wallet, discover token, bounded swap, wrap confidentially
- read-only dashboard with vault, execution, policy, research, decision, funding, confidential position, settlement, system status, activity, and a `Continue in Demo` next-action CTA
- guided three-phase demo for the live judged flow with progressive disclosure instead of a fully expanded checklist
- shared `Next action` banner across `/dashboard` and `/demo`
- readiness banner that explains blocking issues in plain language
- category and chain token discovery before live research scoring
- ChainGPT-assisted explanation for top research candidates when configured
- post-buy confidential wrapping for supported Arbitrum Sepolia ERC-20 outputs
- owner-only confidential balance reveal state
- trust page comparing unsafe autonomy vs bounded confidential execution
- explicit dev-only mock fallback
- shared schemas for policies, recommendations, confidential positions, decisions, and activity logs
- contract skeletons for policy vault, execution guard, and wrapper integration

## 11. Demo Flow

### Phase 1: Connect & Verify

1. Connect the live owner/admin wallet.
2. Verify vault, execution wallet, `ExecutionGuard`, and wrapper relationship against deployed contracts.

### Phase 2: Set Policy & Research

3. Enter policy values.
4. Encrypt relevant policy thresholds with the Nox wrapper.
5. Save policy on-chain and display public-safe metadata.
6. Discover token candidates by category and chain.
7. Trigger the live research agent to score the vetted candidate set.
8. Review ranked recommendation and explanation.
9. Run TypeScript execution decisioning.

### Phase 3: Execute & Close

10. Open a bounded session on-chain.
11. Execute one bounded live exact-input swap on-chain.
12. Wrap the acquired ERC-20 into a Nox confidential asset.
13. Display the confidential position handle.
14. Let the owner reveal the decrypted confidential balance through the Nox handle client.
15. Settle the session, unwrap when needed, or use pause/revoke controls.

## 12. Rubric Mapping

- Architecture: clean hybrid boundary, clear role separation, and separate execution vs confidential wrapper layers.
- Privacy: policy thresholds and post-wrap position balances are handled as confidential handles with public-safe metadata only.
- Trust: AI never has unlimited spending authority; execution is bounded, wrapper-gated, allowlisted, and revocable.
- Demo quality: end-to-end visual flow with live default behavior and an obvious privacy upgrade after the buy.
- Technical depth: monorepo with Next.js, FastAPI, Solidity, shared schemas, Nox abstraction layer, and confidential token wrapper planning.

## 13. Acceptance Criteria

- the repo boots as a monorepo with documented setup
- the web app includes `/`, `/dashboard`, `/demo`, and `/trust`
- the landing page clearly communicates the full operator journey in one glance
- the dashboard is visibly read-only, surfaces all required monitoring cards, and points the operator into the guided demo for actions
- the demo is grouped into `Connect & Verify`, `Set Policy & Research`, and `Execute & Close`
- the demo shows only the current actionable step expanded while future steps remain collapsed until unlocked
- the app shows a shared `Next action` banner on `/dashboard` and `/demo`
- the policy form supports all required fields
- confidential values can be encrypted through the live Nox wrapper path
- the FastAPI agent exposes health, rank, explain, market, and discovery-backed research endpoints
- the judged path uses live market-data inputs for ranking and explanation
- the execution layer checks score threshold, trade limit, budget, token whitelist, wrapper availability, and session status
- the live execution path performs a real guarded exact-input swap instead of a synthetic success state
- after a guarded buy, the app records a confidential position handle for the wrapped output
- the owner can reveal the decrypted confidential balance through the Nox handle client when ACL permits
- the app blocks honestly when Nox config, wrapper config, route config, or allowlist state is missing
- Base, BNB, and Solana recommendations are clearly marked research-only or future-scoped for v1 confidential execution
- the default demo path is live
- the contracts compile as bounded-execution and confidential-wrapper skeletons

## 14. Edge Cases

- no wallet connected: block live actions and show an honest readiness error
- no live Nox config: block live policy encryption and confidential reveal
- research service unavailable: surface an honest error and do not inject fake recommendations
- token not on whitelist: reject execution
- token has no configured wrapper: reject executable status
- unsupported chain: mark recommendation research-only
- confidence below threshold: reject execution
- session expired or paused: reject execution and log the reason
- one trade already used: prevent repeat execution in the same session
- wrapper transaction fails: keep the swap result visible as unwrapped and show recovery guidance
- reveal fails or ACL is missing: keep the handle visible and show `reveal failed`
- fee-on-transfer or deflationary token: reject wrapping unless explicitly supported by a custom wrapper
- unwrap request is created but not finalized: show pending unwrap state until proof/finalization completes

## 15. Hybrid Architecture Rationale

Python is used for the research and scoring engine because heuristic experimentation, signal shaping, and lightweight model-backed research are easier to iterate on there. TypeScript is used for wallet UX, Nox handles, confidential asset metadata, reveal UX, and contract interaction because those responsibilities need tight integration with modern web3 tooling, the frontend, and user-facing execution orchestration. Solidity enforces the bounded execution path and separates that path from the post-buy confidential wrapper layer. This division keeps the privacy boundary coherent and reduces the chance of wallet logic leaking into the research runtime.

## 16. Explicit Technical Note

Python is used for the research/scoring engine, while TypeScript handles wallet UX, Nox handles, confidential policy processing, confidential position state, execution orchestration, contract interaction, and the user-visible activity timeline. The v1 wrapper goal is post-buy wrapping, not a full private trading system or multi-chain confidential asset protocol.
