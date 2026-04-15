# NoxPilot Product Requirements Document

## 1. Product Overview

NoxPilot is a confidential multi-agent crypto execution MVP designed for hackathon evaluation. It separates capital storage from day-to-day execution, keeps policy thresholds private with Nox handle abstractions, and grants AI only bounded operational authority. The user’s primary capital remains in a vault wallet while a dedicated execution wallet handles limited-session execution under revocable controls.

## 2. Problem Statement

Most autonomous crypto agent demos collapse trust boundaries:

- the same wallet both stores capital and executes transactions
- policy thresholds are visible or handled loosely
- AI appears to have broad spending authority
- operator revocation is unclear

This creates an unacceptable trust model for users who want automation without surrendering full control.

NoxPilot addresses that gap by introducing:

- wallet separation
- bounded session funding
- confidential policy handling
- explicit execution guardrails
- clear operator pause and revoke controls

## 3. Target Users

- crypto-native operators who want partial automation without exposing full treasury risk
- DAOs and funds evaluating bounded agent execution workflows
- hackathon judges assessing architecture, privacy posture, and trust minimization
- developers exploring confidential policy execution with hybrid TypeScript and Python services

## 4. MVP Scope

In scope:

- vault and execution wallet model
- confidential policy setup and encrypted handle summary
- research agent that ranks token opportunities
- execution decision engine in TypeScript
- one bounded live exact-input swap per session
- activity log, trust page, and polished dashboard UX
- Solidity skeletons for policy and execution guard contracts with one real guarded swap path
- live judged flow with explicit dev-only mock fallback

Out of scope:

- full production wallet custody
- multi-DEX route optimization
- persistent database-backed history
- audited confidential smart contract logic
- guaranteed market alpha

## 5. Architecture Summary

NoxPilot is intentionally hybrid:

- Next.js + TypeScript handles wallet UX, policy configuration, Nox handle wrapping, contract orchestration, and bounded execution logic.
- FastAPI + Python handles research scoring, signal ranking, rationale generation, and live market intelligence ingestion.
- Solidity provides realistic bounded-execution contracts that store policy references, validate the confidential daily-budget handle path, manage session state, and enforce one guarded swap route.

The boundary is strict:

- the frontend calls internal Next.js routes or the FastAPI service for research output
- FastAPI returns recommendation payloads only
- TypeScript evaluates confidential policy thresholds and decides whether execution is allowed
- wallet logic and Nox handle logic stay on the TypeScript side

## 6. Wallet Model

- `Vault Wallet`: primary capital wallet, meant to retain the majority of funds.
- `Execution Wallet`: separate operational wallet receiving only session-scoped funding.
- session funding is explicit and revocable
- settlement closes the bounded session and records the returned budget on-chain

This keeps main capital isolated from operational execution.

## 7. Agent Model

- `Agent A`: Python research agent that ranks a token whitelist by heuristic opportunity score.
- `Agent B`: TypeScript execution layer that checks the recommendation against confidential policy thresholds and operational constraints.

Agent B is the authority boundary. Research does not directly trigger spending.

## 8. Nox Integration Role

NoxPilot uses a dedicated TypeScript wrapper package around `@iexec-nox/handle` to:

- create a Nox client
- encrypt confidential numeric and boolean policy values
- expose handle ACL lookup helpers
- normalize outputs for the web app
- support proof-backed confidential daily-budget and min-confidence paths into `PolicyVault`
- support an explicit dev-only mock path without making it the default

This preserves a credible integration story without claiming fully operational production privacy in the MVP.

## 9. Feature List

- polished landing page with product story
- dashboard with vault, execution, policy, research, decision, funding, settlement, and safety views
- manual demo stepper for the live judged flow
- trust page comparing unsafe autonomy vs bounded confidential execution
- explicit dev-only mock fallback
- shared schemas for policies, recommendations, decisions, and activity logs
- contract skeletons for policy vault and execution guard

## 10. Demo Flow

1. Connect the live owner/admin wallet.
2. Initialize vault and execution wallet relationship against deployed contracts.
3. Enter policy values.
4. Encrypt relevant policy thresholds with the Nox wrapper.
5. Save policy on-chain and display public-safe metadata.
6. Trigger the live research agent.
7. Review ranked recommendation.
8. Run TypeScript execution decisioning.
9. Open a bounded session on-chain.
10. Execute one bounded live exact-input swap on-chain.
11. Settle the session on-chain and sweep remaining assets back to the vault.
12. Pause or revoke the system.

## 11. Rubric Mapping

- Architecture: clean hybrid boundary and clear role separation.
- Privacy: policy thresholds are handled as confidential handles with public-safe metadata only.
- Trust: AI never has unlimited spending authority; execution is bounded and revocable.
- Demo quality: end-to-end visual flow with live default behavior.
- Technical depth: monorepo with Next.js, FastAPI, Solidity, shared schemas, and Nox abstraction layer.

## 12. Acceptance Criteria

- the repo boots as a monorepo with documented setup
- the web app includes `/`, `/dashboard`, `/demo`, and `/trust`
- the dashboard surfaces all required cards and state views
- the policy form supports all required fields
- confidential values can be encrypted through the live Nox wrapper path
- the FastAPI agent exposes health, rank, explain, and mock-market endpoints
- the judged path uses live market-data inputs for ranking and explanation
- the execution layer checks score threshold, trade limit, budget, token whitelist, and session status
- the live execution path performs a real guarded exact-input swap instead of a synthetic success state
- the default demo path is live
- the contracts compile as bounded-execution skeletons

## 13. Edge Cases

- no wallet connected: block live actions and show an honest readiness error
- no live Nox config: block live policy encryption
- research service unavailable: surface an honest error and do not inject fake recommendations
- token not on whitelist: reject execution
- confidence below threshold: reject execution
- session expired or paused: reject execution and log the reason
- one trade already used: prevent repeat execution in the same session

## 14. Hybrid Architecture Rationale

Python is used for the research and scoring engine because heuristic experimentation, signal shaping, and lightweight model-backed research are easier to iterate on there. TypeScript is used for wallet UX, Nox handles, and contract interaction because those responsibilities need tight integration with modern web3 tooling, the frontend, and user-facing execution orchestration. This division keeps the privacy boundary coherent and reduces the chance of wallet logic leaking into the research runtime.

## 15. Explicit Technical Note

Python is used for the research/scoring engine, while TypeScript handles wallet UX, Nox handles, confidential policy processing, execution orchestration, contract interaction, and the user-visible activity timeline.
