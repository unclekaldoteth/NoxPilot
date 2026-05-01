# iExec / Nox Developer Feedback

This feedback is written for the DoraHacks iExec Vibe Coding Challenge submission.

## What NoxPilot Used

NoxPilot used the Nox toolchain in three places:

- `@iexec-nox/handle` for wallet-backed client encryption, handle proofs, ACL checks, and owner reveal flows in the Next.js app.
- `@iexec-nox/nox-protocol-contracts` for Solidity-side encrypted handle types, `Nox.fromExternal(...)`, `Nox.allow(...)`, and public decrypt proof validation.
- `@iexec-nox/nox-confidential-contracts` for the ERC-7984-style confidential token pattern and the ERC-20 wrapper concept used by `NoxPilotConfidentialERC20Wrapper`.

This project uses the Nox Protocol TEE-based ERC-7984 implementation only. It does not use Zama/FHE or OpenZeppelin ERC-7984 contracts.

The strongest fit was the post-trade privacy flow: an agent can execute a bounded public ERC-20 buy, then move the acquired position into a confidential asset representation where post-wrap balances and reveal permissions are controlled through Nox handles and ACL.

## What Worked Well

- The Handle SDK maps naturally to a browser wallet flow. The app can encrypt policy thresholds on the client side without sending raw thresholds to the Python research agent.
- The Solidity SDK made the important trust boundary demonstrable: `PolicyVault.updatePolicyWithNox()` receives proof-backed external handles, stores confidential budget and confidence handles, and grants `ExecutionGuard` access only when needed.
- The confidential token contracts gave the project a clearer product story than policy encryption alone. The wrapper path lets the demo show a visible before/after privacy upgrade after execution.
- Public decrypt proofs are useful for bounded automation because the app can prove a confidential gate, such as "observed confidence is above private minimum confidence", without revealing the private threshold.

## Developer Friction

- The current Nox package ecosystem is still young, so example coverage matters. We had to inspect package contracts directly to understand how `ERC20ToERC7984Wrapper`, `ERC7984`, handle proof validation, and reveal flows should compose.
- Chain and deployment support needs clearer "known good" matrices. For a hackathon, it is important to know exactly which networks have NoxCompute, gateway, subgraph, SDK resolver, and confidential token support before designing multi-chain execution.
- Error states from wallet, handle gateway, ACL, and public decrypt flows can be hard to explain to users. More structured error codes would help apps produce better operator guidance.
- The distinction between public transaction privacy and post-wrap confidential accounting should be emphasized in docs. It is easy for builders to overclaim privacy if the swap and wrapper deposit remain public.

## Suggested Improvements

- Provide a full reference app showing `@iexec-nox/handle` encryption, Solidity `Nox.fromExternal(...)`, `Nox.allow(...)`, public decrypt proof, ERC-7984 wrapping, reveal, unwrap request, and finalize unwrap in one flow.
- Publish an official per-network support table covering NoxCompute address, handle gateway URL, handle contract, subgraph, resolver support, and confidential token support.
- Add recipes for common web3 app patterns:
  - confidential policy thresholds
  - confidential portfolio balances
  - bounded automated execution
  - public proof of a private boolean gate
  - ERC-20 to confidential asset wrapping
- Improve TypeScript types and docs around handle ACL state so frontend apps can reliably show `can reveal`, `needs permission`, and `unsupported config` states.
- Add explicit warnings/examples for what is not private: public swaps, public token approvals, wrapper deposits, and visible transaction metadata.

## NoxPilot-Specific Learnings

NoxPilot became stronger when we treated Nox as a privacy and authorization layer, not as a black-box "AI trades privately" claim. The safest demo flow is two separate on-chain actions:

1. `executeExactInputSingle` performs the bounded public swap.
2. `wrapLastOutput` converts the acquired ERC-20 into a confidential Nox asset.

That separation made failures explainable, kept the product honest, and aligned the user story with what the current Nox tooling can prove.
