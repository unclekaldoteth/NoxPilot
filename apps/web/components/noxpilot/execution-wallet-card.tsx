"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { formatEth, formatUsd, truncateAddress } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

function LiveCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function tick() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return <span className="animate-countdown font-mono text-cyan-200">{remaining}</span>;
}

const statusSteps = ["idle", "funded", "executed", "settled"] as const;

export function ExecutionWalletCard() {
  const { executionWallet } = useNoxPilot();

  const currentIndex = statusSteps.indexOf(executionWallet.status as typeof statusSteps[number]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.03 }}>
      <SurfaceCard className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
              <Cpu className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Execution Wallet</h3>
              <p className="text-sm leading-6 text-slate-300">Isolated operational wallet with session-bounded funding.</p>
            </div>
          </div>
          <MetricPill label="State" value={executionWallet.status} />
        </div>

        {/* Session lifecycle indicator */}
        <div className="flex items-center gap-1">
          {statusSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={`flex h-6 items-center justify-center rounded-full px-2.5 text-[10px] font-medium uppercase tracking-wider transition-all ${
                i <= currentIndex && currentIndex >= 0
                  ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25"
                  : "bg-white/5 text-slate-600"
              }`}>
                {step}
              </div>
              {i < statusSteps.length - 1 ? (
                <div className={`h-px w-3 transition-colors ${
                  i < currentIndex ? "bg-cyan-400/40" : "bg-white/10"
                }`} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gas balance</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatEth(executionWallet.nativeBalanceEth)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {executionWallet.nativeBalanceUsd === null ? "USD estimate unavailable" : formatUsd(executionWallet.nativeBalanceUsd)}
            </p>
          </div>
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session asset</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {executionWallet.sessionAssetBalance === null
                ? "n/a"
                : executionWallet.sessionAssetBalance.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{executionWallet.sessionAssetSymbol}</p>
          </div>
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session budget</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatUsd(executionWallet.dailyBudgetUsd)}</p>
          </div>
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Remaining</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatUsd(executionWallet.remainingBudgetUsd)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>{truncateAddress(executionWallet.walletAddress)}</span>
          <span className="text-slate-600">•</span>
          {executionWallet.sessionActive && executionWallet.sessionEndsAt ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              Expires in <LiveCountdown endsAt={executionWallet.sessionEndsAt} />
            </span>
          ) : (
            <span>No active session</span>
          )}
        </div>
      </SurfaceCard>
    </motion.div>
  );
}
