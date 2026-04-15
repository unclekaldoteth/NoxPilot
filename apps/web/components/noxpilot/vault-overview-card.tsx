"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { formatEth, formatUsd, truncateAddress } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function VaultOverviewCard() {
  const { vault } = useNoxPilot();

  const totalForBar = Math.max(vault.totalBalanceUsd, 1);
  const allocatedPct = Math.min((vault.allocatedSessionUsd / totalForBar) * 100, 100);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <SurfaceCard className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
              <Building2 className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Vault Wallet</h3>
              <p className="text-sm leading-6 text-slate-300">Primary capital — isolated from execution.</p>
            </div>
          </div>
          <MetricPill label="Status" value={vault.status} accent="emerald" />
        </div>

        {/* Balance bar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between text-xs text-slate-500">
            <span>Available</span>
            <span>Allocated to session</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.85),rgba(34,211,238,0.6))]"
              initial={{ width: 0 }}
              animate={{ width: `${100 - allocatedPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallet balance</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatEth(vault.nativeBalanceEth)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {vault.nativeBalanceUsd === null ? "USD estimate unavailable" : formatUsd(vault.nativeBalanceUsd)}
            </p>
          </div>
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Available</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">{formatUsd(vault.availableBalanceUsd)}</p>
          </div>
          <div className="glass-outline rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">In session</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-200">{formatUsd(vault.allocatedSessionUsd)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>{truncateAddress(vault.walletAddress)}</span>
          <span className="text-slate-600">•</span>
          <span>{vault.networkLabel}</span>
        </div>
      </SurfaceCard>
    </motion.div>
  );
}
