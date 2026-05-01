import type { ConfidentialPosition, ExecutionWalletState } from "@noxpilot/shared";

export type OperatorPhaseKey = "connect-verify" | "policy-research" | "execute-close";
export type OperatorStepKey =
  | "connect"
  | "topology"
  | "policy"
  | "discover"
  | "research"
  | "decision"
  | "fund"
  | "execute"
  | "confidential"
  | "settle";

export type OperatorFlowState = {
  walletConnected: boolean;
  networkSupported: boolean;
  liveConfigReady: boolean;
  topologyReady: boolean;
  encryptedPolicyReady: boolean;
  tokenDiscoveryReady: boolean;
  recommendationReady: boolean;
  decisionReady: boolean;
  executionWalletStatus: ExecutionWalletState["status"];
  sessionActive: boolean;
  confidentialPosition: ConfidentialPosition | null;
  settlementReady: boolean;
};

export const OPERATOR_PHASES: Array<{
  key: OperatorPhaseKey;
  title: string;
  description: string;
  stepKeys: OperatorStepKey[];
}> = [
  {
    key: "connect-verify",
    title: "Connect & Verify",
    description: "Connect the owner wallet, switch to the supported network, and verify the live contract wiring.",
    stepKeys: ["connect", "topology"]
  },
  {
    key: "policy-research",
    title: "Set Policy & Research",
    description: "Lock in the private policy, expand the token set, and review the scored recommendation.",
    stepKeys: ["policy", "discover", "research", "decision"]
  },
  {
    key: "execute-close",
    title: "Execute & Close",
    description: "Open one bounded session, execute the swap, protect the acquired position, and close the run.",
    stepKeys: ["fund", "execute", "confidential", "settle"]
  }
];

export const OPERATOR_STEPS: Array<{
  key: OperatorStepKey;
  phase: OperatorPhaseKey;
  title: string;
  shortLabel: string;
  description: string;
  doneLabel: string;
  lockedLabel: string;
}> = [
  {
    key: "connect",
    phase: "connect-verify",
    title: "Connect Owner Wallet",
    shortLabel: "Connect",
    description: "Use the deployed owner/admin wallet on Arbitrum Sepolia Testnet before anything else unlocks.",
    doneLabel: "Owner wallet connected on the supported chain.",
    lockedLabel: "Connect the owner wallet on Arbitrum Sepolia Testnet first."
  },
  {
    key: "topology",
    phase: "connect-verify",
    title: "Verify Live Setup",
    shortLabel: "Verify",
    description: "Confirm the vault, execution guard, and confidential wrappers are wired for the live demo.",
    doneLabel: "Contracts, controller wiring, and configured wrappers were verified.",
    lockedLabel: "Finish wallet and network setup first."
  },
  {
    key: "policy",
    phase: "policy-research",
    title: "Save Private Policy",
    shortLabel: "Policy",
    description: "Set budget, token scope, confidence threshold, and slippage, then encrypt the sensitive fields.",
    doneLabel: "Private policy saved with encrypted thresholds.",
    lockedLabel: "Verify the live setup before saving the policy."
  },
  {
    key: "discover",
    phase: "policy-research",
    title: "Discover Candidates",
    shortLabel: "Discover",
    description: "Search Base, BNB, and Solana by category to build a better candidate set before ranking.",
    doneLabel: "A discovery shortlist is ready for ranking.",
    lockedLabel: "Save the private policy first."
  },
  {
    key: "research",
    phase: "policy-research",
    title: "Run Live Research",
    shortLabel: "Research",
    description: "Score the vetted candidate set with live market data, then attach a ChainGPT explanation.",
    doneLabel: "Live ranking and explanation are available.",
    lockedLabel: "Discover candidates or keep the current whitelist first."
  },
  {
    key: "decision",
    phase: "policy-research",
    title: "Review Execution Decision",
    shortLabel: "Decision",
    description: "Check whether the top pick clears your private policy, wrapper support, and execution constraints.",
    doneLabel: "Execution decision has been produced for the current pick.",
    lockedLabel: "Run live research first."
  },
  {
    key: "fund",
    phase: "execute-close",
    title: "Open Bounded Session",
    shortLabel: "Fund",
    description: "Fund a single live session inside the execution guard without exposing the full vault.",
    doneLabel: "Bounded session is funded and ready to trade.",
    lockedLabel: "Approve the execution decision first."
  },
  {
    key: "execute",
    phase: "execute-close",
    title: "Execute Guarded Swap",
    shortLabel: "Execute",
    description: "Run one real exact-input swap through the guard using the session budget and allowlist constraints.",
    doneLabel: "The guarded swap has executed.",
    lockedLabel: "Open the bounded session first."
  },
  {
    key: "confidential",
    phase: "execute-close",
    title: "Protect the Position",
    shortLabel: "Protect",
    description: "Wrap the acquired ERC-20 into a confidential Nox asset, then reveal the balance only if you want to inspect it.",
    doneLabel: "Acquired position is wrapped as a confidential asset.",
    lockedLabel: "Execute the guarded swap first."
  },
  {
    key: "settle",
    phase: "execute-close",
    title: "Close the Run",
    shortLabel: "Close",
    description: "Settle the session back to the vault and leave the final result in a clean, reviewable state.",
    doneLabel: "Session has been settled back to the vault.",
    lockedLabel: "Wrap the acquired position first."
  }
];

function isConfidentialPositionProtected(confidentialPosition: ConfidentialPosition | null) {
  return Boolean(confidentialPosition?.encryptedBalanceHandle) || confidentialPosition?.status === "unwrapped";
}

export function getOperatorStepCompletion(state: OperatorFlowState) {
  return [
    state.walletConnected && state.networkSupported,
    state.liveConfigReady && state.topologyReady,
    state.encryptedPolicyReady,
    state.tokenDiscoveryReady,
    state.recommendationReady,
    state.decisionReady,
    state.sessionActive ||
      state.executionWalletStatus === "executed" ||
      state.executionWalletStatus === "settled",
    state.executionWalletStatus === "executed" || state.executionWalletStatus === "settled",
    isConfidentialPositionProtected(state.confidentialPosition),
    state.settlementReady
  ];
}

export function getOperatorCurrentStepIndex(state: OperatorFlowState) {
  const completed = getOperatorStepCompletion(state);
  const currentStep = completed.findIndex((value) => !value);
  return currentStep === -1 ? OPERATOR_STEPS.length - 1 : currentStep;
}

export function getOperatorCurrentPhaseIndex(state: OperatorFlowState) {
  const stepIndex = getOperatorCurrentStepIndex(state);
  const phaseKey = OPERATOR_STEPS[stepIndex]?.phase ?? OPERATOR_PHASES[OPERATOR_PHASES.length - 1]?.key;
  return OPERATOR_PHASES.findIndex((phase) => phase.key === phaseKey);
}

export function getOperatorCompletionCount(state: OperatorFlowState) {
  return getOperatorStepCompletion(state).filter(Boolean).length;
}

export function getNextOperatorAction(state: OperatorFlowState) {
  if (!state.walletConnected) {
    return {
      phaseLabel: "Connect & Verify",
      stepKey: "connect" as const,
      title: "Connect the owner wallet",
      description: "Use the same wallet that owns PolicyVault and administers ExecutionGuard.",
      buttonLabel: "Open guided demo"
    };
  }

  if (!state.networkSupported) {
    return {
      phaseLabel: "Connect & Verify",
      stepKey: "connect" as const,
      title: "Switch to Arbitrum Sepolia Testnet",
      description: "The live path stays blocked until the owner wallet is on the supported chain.",
      buttonLabel: "Fix in demo"
    };
  }

  if (!state.liveConfigReady) {
    return {
      phaseLabel: "Connect & Verify",
      stepKey: "topology" as const,
      title: "Finish the live contract configuration",
      description: "The app still needs a complete contract, router, token, or wrapper configuration before it can verify the setup.",
      buttonLabel: "Review setup"
    };
  }

  if (!state.topologyReady) {
    return {
      phaseLabel: "Connect & Verify",
      stepKey: "topology" as const,
      title: "Verify the live setup",
      description: "Register the execution wallet and confirm the guard, controller, and wrapper wiring.",
      buttonLabel: "Verify now"
    };
  }

  if (!state.encryptedPolicyReady) {
    return {
      phaseLabel: "Set Policy & Research",
      stepKey: "policy" as const,
      title: "Save the private policy",
      description: "The budget, confidence threshold, and slippage must be encrypted before research and execution can proceed.",
      buttonLabel: "Set policy"
    };
  }

  if (!state.tokenDiscoveryReady) {
    return {
      phaseLabel: "Set Policy & Research",
      stepKey: "discover" as const,
      title: "Discover a candidate set",
      description: "Start with category-based discovery so the research agent has a wider set to score than the default whitelist.",
      buttonLabel: "Discover tokens"
    };
  }

  if (!state.recommendationReady) {
    return {
      phaseLabel: "Set Policy & Research",
      stepKey: "research" as const,
      title: "Run live research",
      description: "Score the candidate set and attach a ChainGPT explanation to the top-ranked pick.",
      buttonLabel: "Run research"
    };
  }

  if (!state.decisionReady) {
    return {
      phaseLabel: "Set Policy & Research",
      stepKey: "decision" as const,
      title: "Review the execution decision",
      description: "Check whether the recommendation clears the private policy and confidential wrapper requirements.",
      buttonLabel: "Review decision"
    };
  }

  if (
    !state.sessionActive &&
    state.executionWalletStatus !== "executed" &&
    state.executionWalletStatus !== "settled"
  ) {
    return {
      phaseLabel: "Execute & Close",
      stepKey: "fund" as const,
      title: "Open the bounded session",
      description: "Move only the approved session budget into the execution guard before the trade.",
      buttonLabel: "Fund session"
    };
  }

  if (state.executionWalletStatus !== "executed" && state.executionWalletStatus !== "settled") {
    return {
      phaseLabel: "Execute & Close",
      stepKey: "execute" as const,
      title: "Execute the guarded swap",
      description: "The live session is funded, so you can now perform the single approved swap.",
      buttonLabel: "Execute trade"
    };
  }

  if (!isConfidentialPositionProtected(state.confidentialPosition)) {
    return {
      phaseLabel: "Execute & Close",
      stepKey: "confidential" as const,
      title: "Wrap the acquired ERC-20",
      description: "Turn the position into a confidential Nox asset before closing the run.",
      buttonLabel: "Protect position"
    };
  }

  if (!state.settlementReady) {
    return {
      phaseLabel: "Execute & Close",
      stepKey: "settle" as const,
      title: "Settle the session back to the vault",
      description: "Close the run and sweep the remaining session assets back to the vault wallet.",
      buttonLabel: "Close run"
    };
  }

  return {
    phaseLabel: "Run complete",
    stepKey: "settle" as const,
    title: "Review the completed run",
    description: "The bounded session is closed. You can now review the activity timeline, research record, and confidential position state.",
    buttonLabel: "Review timeline"
  };
}
