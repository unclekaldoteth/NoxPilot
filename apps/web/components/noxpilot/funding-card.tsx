"use client";

import { Loader2, WalletCards } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { formatTime, formatUsd } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function FundingCard({ interactive = false }: { interactive?: boolean }) {
  const { decision, executionWallet, fundExecutionWallet, isFunding, fundingStage } = useNoxPilot();
  const fundingSteps = [
    "Opening session on-chain…",
    "Approving session asset…",
    "Funding execution guard…"
  ] as const;
  const activeFundingStep =
    fundingStage === "opening-session"
      ? 0
      : fundingStage === "approving-asset"
        ? 1
        : fundingStage === "funding-guard"
          ? 2
          : -1;
  const completedFundingSteps = executionWallet.sessionActive ? fundingSteps.length : Math.max(activeFundingStep, 0);

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
            <WalletCards className="h-5 w-5 text-emerald-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Session Funding</h3>
            <p className="text-sm leading-6 text-slate-300">Opens an on-chain session and moves the session asset into ExecutionGuard.</p>
          </div>
        </div>
        <MetricPill label="Session" value={executionWallet.sessionActive ? "active" : "idle"} accent="emerald" />
      </div>

      {/* Multi-step tx progress */}
      {isFunding ? (
        <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Transaction progress</p>
          <div className="space-y-2">
            {fundingSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-sm">
                {i < completedFundingSteps ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] text-emerald-300">✓</span>
                ) : i === activeFundingStep ? (
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] text-slate-500">{i + 1}</span>
                )}
                <span className={i < completedFundingSteps || i === activeFundingStep ? "text-white" : "text-slate-500"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-outline rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Required funding</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatUsd(decision?.requiredFundingUsd ?? 0)} {executionWallet.sessionAssetSymbol}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Wallet balance:{" "}
            {executionWallet.sessionAssetBalance === null
              ? "not loaded"
              : `${executionWallet.sessionAssetBalance.toFixed(2)} ${executionWallet.sessionAssetSymbol}`}
          </p>
        </div>
        <div className="glass-outline rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session expiry</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatTime(executionWallet.sessionEndsAt)}</p>
        </div>
      </div>

      {interactive ? (
        <Button
          onClick={() => void fundExecutionWallet()}
          disabled={!decision?.allowed || executionWallet.sessionActive || isFunding}
        >
          {isFunding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Transactions…
            </>
          ) : executionWallet.sessionActive ? (
            "Session Already Open"
          ) : (
            "Open Bounded Session On-Chain"
          )}
        </Button>
      ) : null}
    </SurfaceCard>
  );
}
