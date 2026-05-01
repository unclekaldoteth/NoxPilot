# NoxPilot Contracts

The `contracts/` package is Foundry-based and targets Arbitrum Sepolia by default. The contracts are intentionally scoped as hackathon MVP skeletons: they compile, they can be smoke-tested locally, and they model bounded execution without claiming production-ready confidential enforcement on-chain.

## Contracts

- `src/PolicyVault.sol`
  Stores the vault owner, registered execution wallet, policy handle references, and bounded session state. The live path now also accepts proof-backed confidential daily-budget and min-confidence handles through the official Nox Solidity SDK.
- `src/ExecutionGuard.sol`
  Validates that a registered execution wallet can only act during an active session, within budget, within trade-count limits, and against a token allowlist anchored to the vault's current whitelist reference. It also funds the real session asset, executes one exact-input swap through a configured router, and sweeps settlement assets back to the vault owner.
- `script/Deploy.s.sol`
  Minimal Foundry deploy script that reads deploy settings from environment variables and wires the vault to the guard.
- `script/DeployWrappers.s.sol`
  Wrapper-only deploy script that targets an existing `ExecutionGuard`, deploys missing `NoxPilotConfidentialERC20Wrapper` instances, and registers them without redeploying the vault or guard.
- `script/BootstrapArbExecutionLane.s.sol`
  Deploys a demo ARB token, deploys/registers its confidential wrapper on the existing `ExecutionGuard`, swaps wrapped native test ETH into the configured session USDC, and seeds a Uniswap V3 `ARB/USDC` pool for the ARB execution lane.

## Prerequisites

- Foundry installed locally: `forge --version`
- An Arbitrum Sepolia RPC URL
- A funded deployer key if you want to broadcast

If Foundry is not installed yet:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Install / Setup

From the monorepo root:

```bash
cd contracts
cp .env.example .env
```

The shipped template already fills the public Arbitrum Sepolia defaults used by this repo:

- `ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc`
- `SESSION_ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` for Circle test USDC
- `SWAP_ROUTER_ADDRESS=0x101F443B4d1b059569D643917553c771E1b9663E` for Uniswap `SwapRouter02`
- `DEFAULT_POOL_FEE=3000` for the default 0.3% pool tier

You still need to set:

- `PRIVATE_KEY` to a funded Arbitrum Sepolia deployer
- `OWNER_ADDRESS` to the wallet that should own `PolicyVault`
- `EXECUTION_WALLET_ADDRESS` to the isolated operator wallet registered in the vault

The deployer can be different from `OWNER_ADDRESS`; the script deploys with the signer, wires the contracts, and then transfers vault ownership if needed.

Load the environment for the current shell:

```bash
set -a
source .env
set +a
```

## Compile

```bash
cd contracts
forge build
```

## Test

```bash
cd contracts
forge test -vv
```

The test suite is intentionally lightweight. It covers:

- vault policy/session lifecycle
- session accounting
- guard funding + exact-input swap execution
- guard settlement sweep back to the owner
- whitelist-reference sync rejection after policy rotation

## Deploy

```bash
cd contracts
set -a
source .env
set +a
forge script script/Deploy.s.sol:Deploy --offline -vv
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast \
  -vv
```

The first command is a local dry-run. The second broadcasts to Arbitrum Sepolia.

## Deploy Wrappers Only

Use this path after the vault and guard already exist and you only want to add confidential wrappers.

Required additions in `contracts/.env`:

- `EXECUTION_GUARD_ADDRESS`: existing live `ExecutionGuard`
- `DEPLOY_WRAPPER_ETH=true|false`
- `DEPLOY_WRAPPER_ARB=true|false`
- `DEPLOY_WRAPPER_LINK=true|false`

The script is intentionally safe by default:

- it reverts before broadcast if no wrapper toggle is enabled
- it reverts before broadcast if the signer is not the current `ExecutionGuard.admin()`
- it skips any token that already has a registered wrapper, so reruns are idempotent

Commands:

```bash
cd contracts
set -a
source .env
set +a
forge script script/DeployWrappers.s.sol:DeployWrappers \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  -vv
forge script script/DeployWrappers.s.sol:DeployWrappers \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast \
  -vv
```

Unlike the full bootstrap deploy, the wrapper-only script cannot use `--offline` because it must read the existing `ExecutionGuard` admin and current wrapper registry from chain state before broadcasting.

After wrapper deployment, copy the emitted wrapper addresses into:

- `NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ETH_ADDRESS`
- `NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS`
- `NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_LINK_ADDRESS`

## Bootstrap The ARB Execution Lane

Use this path only when ARB is not yet executable because Arbitrum Sepolia does not already have a suitable `ARB/USDC` pool for the configured router/quoter/session-asset path.

What it does:

- deploys `DemoArbToken` with symbol `ARB`
- deploys `NoxPilotConfidentialERC20Wrapper` for that token
- registers the wrapper on the existing `ExecutionGuard`
- uses a configurable slice of the owner's existing session `USDC` balance as LP seed
- seeds a Uniswap V3 `ARB/USDC` pool at the configured fee tier through `NonfungiblePositionManager`

Required env additions:

- `EXECUTION_GUARD_ADDRESS`
- `SESSION_ASSET_ADDRESS`
- `DEFAULT_POOL_FEE`

Optional env tuning:

- `ARB_BOOTSTRAP_POSITION_MANAGER_ADDRESS`
- `ARB_BOOTSTRAP_SESSION_ASSET_SEED_AMOUNT`
- `ARB_BOOTSTRAP_USDC_E6_PER_ARB`

Command:

```bash
cd contracts
set -a
source .env
set +a
forge script script/BootstrapArbExecutionLane.s.sol:BootstrapArbExecutionLane \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast \
  -vv
```

Important:

- this path creates a testnet demo ARB market lane; it is not an official bridged ARB deployment
- the resulting `TOKEN_ARB_ADDRESS` should be copied into the app env after broadcast
- the resulting ARB wrapper address should be copied into `NEXT_PUBLIC_CONFIDENTIAL_WRAPPER_ARB_ADDRESS`
- the wallet must already hold Arbitrum Sepolia test `USDC`, because the script no longer performs a fragile testnet seed swap
- `ARB_BOOTSTRAP_SESSION_ASSET_SEED_AMOUNT` should stay below the wallet's available `USDC` balance so some session funding remains after pool bootstrap

## Current Live Arbitrum Sepolia Deployment

Snapshot updated April 29, 2026:

| Component | Address | Explorer |
|---|---|---|
| `PolicyVault` | `0xAfF2d2794cFE82f75086FD715BFd198585b69b81` | [Arbiscan](https://sepolia.arbiscan.io/address/0xAfF2d2794cFE82f75086FD715BFd198585b69b81) |
| `ExecutionGuard` | `0xa1a12b3C04466a2480A562f9858eb4188EFB0a29` | [Arbiscan](https://sepolia.arbiscan.io/address/0xa1a12b3C04466a2480A562f9858eb4188EFB0a29) |
| `DemoArbToken (ARB)` | `0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E` | [Arbiscan](https://sepolia.arbiscan.io/address/0xAc30C815749513fFC56B2705f8A8408D1a1cEf2E) |
| `ARB/USDC pool` | `0xB85cf4A6d305e8c19eC476C3187db949D665C43b` | [Arbiscan](https://sepolia.arbiscan.io/address/0xB85cf4A6d305e8c19eC476C3187db949D665C43b) |
| `NoxPilotConfidentialERC20Wrapper (WETH)` | `0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9` | [Arbiscan](https://sepolia.arbiscan.io/address/0x18B1973a26f91b72E6157465a9ba4E207C2EE0F9) |
| `NoxPilotConfidentialERC20Wrapper (ARB)` | `0x18C35645080A279170471b0bfCbD888946F3D674` | [Arbiscan](https://sepolia.arbiscan.io/address/0x18C35645080A279170471b0bfCbD888946F3D674) |
| `NoxPilotConfidentialERC20Wrapper (LINK)` | `0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5` | [Arbiscan](https://sepolia.arbiscan.io/address/0x9a0532E79aA04f2E36D4199FD6cDf69d09729bf5) |

Broadcast hashes:

- bootstrap vault: [0x52e15041...](https://sepolia.arbiscan.io/tx/0x52e15041c72a306c06a001c23006ee56e04c6747eda771de611d28e1ce015168)
- bootstrap guard: [0xab5ccc34...](https://sepolia.arbiscan.io/tx/0xab5ccc34303387e451467b1ef78803f3c34b30ba850b86c95406b1b095cedece)
- WETH wrapper deploy: [0x0923c184...](https://sepolia.arbiscan.io/tx/0x0923c184c0e234ef9208995df7ef9d7a5fb9c285854e3d71f6ef767db4089bd4)
- LINK wrapper deploy: [0x1092421f...](https://sepolia.arbiscan.io/tx/0x1092421f11bff12b10355334a706f98ec6509b47617760b0f235e975a368331a)
- ARB token deploy: [0x384856dc...](https://sepolia.arbiscan.io/tx/0x384856dca11e7bb92ae11f474b37778c9fcfcec66c8c938bd1f715fd29df6233)
- ARB wrapper deploy: [0xafba4d8e...](https://sepolia.arbiscan.io/tx/0xafba4d8efd8adc4d591410d3d4afe9c5dc2539ee5cd64bbb5a9ffaadb477b020)
- ARB bootstrap pool seed + mint sequence: [0x508898f4...](https://sepolia.arbiscan.io/tx/0x508898f40067eb8c2caac257e597e5a1257f7c57b890892193c328c61f608b0c)

## Required Environment Variables

- `ARBITRUM_SEPOLIA_RPC_URL`: RPC endpoint for deployment and live verification; the public Arbitrum endpoint is prefilled in the example template
- `PRIVATE_KEY`: deployer private key used by the Foundry script
- `OWNER_ADDRESS`: owner of the deployed `PolicyVault`
- `EXECUTION_WALLET_ADDRESS`: isolated operational wallet registered in the vault
- `SESSION_ASSET_ADDRESS`: ERC-20 used as the session funding asset in the guarded swap path; the template defaults to Circle test USDC on Arbitrum Sepolia
- `SWAP_ROUTER_ADDRESS`: router that `ExecutionGuard` will call for `exactInputSingle`; the template defaults to Uniswap `SwapRouter02` on Arbitrum Sepolia
- `DEFAULT_POOL_FEE`: pool fee for the default exact-input route, for example `3000`

## Related Web Env Defaults

If you want to use the live web app after deployment, mirror the same network values into the root `.env` and `apps/web/.env.local` files. The updated examples now also prefill:

- `NEXT_PUBLIC_DEX_QUOTER_ADDRESS=0x2779a0CC1c3e0E44D2542EC3e79e3864Ae93Ef0B`
- `NEXT_PUBLIC_TOKEN_ETH_ADDRESS=0x980B62Da83eFf3D4576C647993b0c1D7faf17c73`
- `NEXT_PUBLIC_TOKEN_LINK_ADDRESS=0xb1D4538B4571d411F07960EF2838Ce337FE1E80E`

You still need to supply the deployed `NEXT_PUBLIC_POLICY_VAULT_ADDRESS` and `NEXT_PUBLIC_EXECUTION_GUARD_ADDRESS` after broadcast.

## Validation Summary

What was hardened:

- confirmed the package is Foundry-based and compiles through Foundry's pinned `solc` 0.8.33 compiler
- tightened `PolicyVault` session validation so zero-funded, zero-trade, zero-expiry, or duplicate active sessions are rejected
- added a real Nox-native `updatePolicyWithNox()` path so the confidential daily-budget and min-confidence handles enter the vault through `Nox.fromExternal(...)`
- kept `policyWhitelistRoot()` and `policyMetadataUri()` helpers so downstream integrations can reference the vault policy cleanly
- anchored `ExecutionGuard` to the vault's current whitelist reference with an explicit `syncPolicyWhitelistRoot()` step, so stale token-reference lists are rejected instead of silently drifting
- added a `prepareConfidenceApproval()` step so the guard can compare the confidential min-confidence threshold on-chain, expose a publicly decryptable boolean handle, and verify the resulting proof during execution
- replaced the default execution path with real session-asset funding, one exact-input router swap, and token sweeping on settlement
- fixed the deploy script so the broadcast signer can configure the vault first and then transfer ownership to `OWNER_ADDRESS` when the signer and owner are different
- added dependency-free smoke tests so `forge test` verifies the core vault/guard flow locally

What remains scaffold-level by design:

- only the daily-budget and min-confidence fields are currently validated through the live Nox proof path; the other policy fields remain stored as handles and metadata anchors
- token allowlist membership is still a simple admin-maintained mapping that is anchored to a vault whitelist root; it is not yet a proof-backed Merkle verification path
- the swap adapter is intentionally narrow: one exact-input path, one configured session asset, and one configured router

## Exact Local Validation Commands

```bash
cd contracts
forge build
forge test -vv
set -a
source .env
set +a
forge script script/Deploy.s.sol:Deploy --offline -vv
forge script script/Deploy.s.sol:Deploy --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" --broadcast -vv
```
