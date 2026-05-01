#!/usr/bin/env bash
set -euo pipefail

WRAPPER="contracts/src/NoxPilotConfidentialERC20Wrapper.sol"

required_imports=(
  '@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol'
  '@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol'
  '@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC20ToERC7984Wrapper.sol'
  '@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol'
  '@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984Base.sol'
)

for required_import in "${required_imports[@]}"; do
  if ! grep -Fq "$required_import" "$WRAPPER"; then
    echo "Missing required Nox Protocol ERC-7984 import: $required_import" >&2
    exit 1
  fi
done

if ! grep -Fq "contract NoxPilotConfidentialERC20Wrapper is ERC7984, IERC20ToERC7984Wrapper" "$WRAPPER"; then
  echo "NoxPilotConfidentialERC20Wrapper must extend Nox Protocol ERC7984 and IERC20ToERC7984Wrapper." >&2
  exit 1
fi

if rg -n '@zama|fhevm|TFHE|@openzeppelin/contracts.*/.*ERC7984|@openzeppelin/contracts.*/.*ERC-7984' contracts/src contracts/script contracts/test package.json pnpm-lock.yaml; then
  echo "Unsupported ERC-7984/FHE implementation detected. Use the Nox Protocol TEE-based ERC-7984 stack only." >&2
  exit 1
fi

echo "Nox Protocol ERC-7984 verification passed."
