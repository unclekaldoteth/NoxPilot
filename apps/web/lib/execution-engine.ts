import type {
  ActivityItem,
  AppMode,
  ExecutionDecision,
  ExecutionWalletState,
  PrivatePolicyInput,
  Recommendation,
  SettlementResult,
  VaultState
} from "@noxpilot/shared";
import { DEFAULT_PROTOCOL } from "@noxpilot/shared";

type EvaluationInput = {
  mode: AppMode;
  paused: boolean;
  policy: PrivatePolicyInput | null;
  recommendation: Recommendation | null;
  vault: VaultState;
  executionWallet: ExecutionWalletState;
  wrapperReady?: boolean;
  wrapperReason?: string | null;
};

export function evaluateExecution(input: EvaluationInput): ExecutionDecision {
  if (!input.policy || !input.recommendation) {
    return {
      allowed: false,
      action: "wait",
      token: input.recommendation?.symbol ?? null,
      reasons: ["A saved policy and a research recommendation are required before execution can be evaluated."],
      requiredFundingUsd: 0,
      estimatedSpendUsd: 0,
      mode: input.mode
    };
  }

  const reasons: string[] = [];
  const walletUsdEstimate = input.vault.nativeBalanceUsd;
  const estimatedSpendUsd = Math.min(
    input.policy.dailyBudgetUsd,
    input.executionWallet.sessionActive ? input.executionWallet.remainingBudgetUsd : walletUsdEstimate ?? 0
  );

  if (input.paused) {
    reasons.push("System is paused by the operator.");
  }
  if (input.recommendation.execution_status && input.recommendation.execution_status !== "executable") {
    reasons.push(
      input.recommendation.execution_note ??
        "Recommended token is research-only until its chain and token address are explicitly configured for execution."
    );
  }
  if (input.wrapperReady === false) {
    reasons.push(
      input.wrapperReason ?? "Recommended token cannot be wrapped into a confidential asset with the current live config."
    );
  }
  if (!input.policy.allowedTokens.includes(input.recommendation.symbol)) {
    reasons.push("Recommended token is outside the allowed token list.");
  }
  if (input.recommendation.score < input.policy.minConfidenceScore) {
    reasons.push("Recommendation score is below the confidential threshold.");
  }
  if (input.recommendation.confidence < input.policy.minConfidenceScore) {
    reasons.push("Recommendation confidence is below the confidential threshold.");
  }
  if (input.policy.oneTradePerDay && input.executionWallet.tradesUsedToday >= input.executionWallet.tradeLimit) {
    reasons.push("The one-trade session limit has already been used.");
  }
  if (input.executionWallet.sessionActive && input.executionWallet.sessionEndsAt) {
    const sessionExpired = new Date(input.executionWallet.sessionEndsAt).getTime() <= Date.now();
    if (sessionExpired) {
      reasons.push("The active execution session has expired.");
    }
  }
  if (input.policy.allowedProtocol !== DEFAULT_PROTOCOL) {
    reasons.push(
      `The current live MVP only records bounded execution through ${DEFAULT_PROTOCOL}. Update the allowed protocol to continue.`
    );
  }
  if (walletUsdEstimate === null) {
    reasons.push("Vault wallet USD capacity is unavailable because the live ETH/USD market snapshot has not been fetched.");
  } else if (walletUsdEstimate <= 0) {
    reasons.push("Vault wallet has no live USD-equivalent capacity for a bounded session.");
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    action: allowed ? (input.executionWallet.sessionActive ? "execute" : "fund") : "blocked",
    token: input.recommendation.symbol,
    reasons: allowed
      ? [
          "Recommendation clears the confidential threshold.",
          "Token is on the allowed list.",
          "Budget and session limits remain intact."
        ]
      : reasons,
    requiredFundingUsd: allowed ? estimatedSpendUsd : 0,
    estimatedSpendUsd: allowed ? estimatedSpendUsd : 0,
    mode: input.mode
  };
}

export function buildSettlement(
  recommendation: Recommendation,
  spendUsd: number,
  mode: AppMode
): SettlementResult {
  const pnlUsd = 0;
  const amountReturnedUsd = Number(spendUsd.toFixed(2));

  return {
    amountReturnedUsd,
    pnlUsd,
    sessionClosed: true,
    txRef: `${mode === "live" ? "arb-sepolia" : "mock"}-${Date.now().toString(36)}`,
    summary: `Session metadata was settled without projecting simulated PnL.`
  };
}

export function createActivity(
  actor: ActivityItem["actor"],
  status: ActivityItem["status"],
  title: string,
  detail: string
): ActivityItem {
  return {
    id: `${actor}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    actor,
    title,
    detail,
    status
  };
}
