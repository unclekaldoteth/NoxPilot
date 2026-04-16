"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";

const steps = [
  "Connect wallet",
  "Initialize topology",
  "Encrypt policy",
  "Trigger research",
  "Evaluate decision",
  "Open session",
  "Execute live swap",
  "Wrap confidential asset",
  "Settle session",
  "Pause / revoke"
];

export function DemoStepper() {
  const { walletConnected, encryptedPolicy, recommendation, decision, executionWallet, confidentialPosition, settlement, systemPaused } = useNoxPilot();

  const completedCount = [
    walletConnected,
    executionWallet.walletAddress !== "Execution wallet unassigned",
    Boolean(encryptedPolicy),
    Boolean(recommendation),
    Boolean(decision),
    executionWallet.sessionActive || executionWallet.status === "executed" || executionWallet.status === "settled",
    executionWallet.status === "executed" || executionWallet.status === "settled",
    Boolean(confidentialPosition?.encryptedBalanceHandle) || confidentialPosition?.status === "unwrapped",
    Boolean(settlement),
    systemPaused
  ].filter(Boolean).length;

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_70px_rgba(2,6,23,0.35)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Demo flow</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Manual end-to-end live flow</h2>
        </div>
        <Badge variant="default">{completedCount}/{steps.length} steps advanced</Badge>
      </div>

      <div className="mt-6 space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.95))]"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const done = index < completedCount;
            const active = index === completedCount;

            return (
              <div
                key={step}
                className={cn(
                  "rounded-3xl border px-4 py-3 text-sm",
                  done
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                    : active
                      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.03] text-slate-400"
                )}
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/20 text-xs">
                  {index + 1}
                </span>
                {step}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
