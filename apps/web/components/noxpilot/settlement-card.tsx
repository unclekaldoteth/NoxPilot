"use client";

import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Check, Loader2 } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function SettlementCard({ interactive = false }: { interactive?: boolean }) {
  const { settlement, executionWallet, settleToVault, isSettling } = useNoxPilot();

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
            <ArrowRightLeft className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Settlement</h3>
            <p className="text-sm leading-6 text-slate-300">Closes the session and sweeps remaining assets back to the vault wallet.</p>
          </div>
        </div>
        <MetricPill label="State" value={settlement ? "closed" : executionWallet.status} />
      </div>

      {!settlement ? (
        <div className="glass-outline space-y-3 rounded-3xl p-4 text-sm text-slate-400">
          <p>No closed run yet. Settle the active session after the swap completes so the remaining assets return to the vault.</p>
          {!interactive ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/demo#step-settle">Close run in demo</Link>
            </Button>
          ) : (
            <p className="text-slate-500">Settlement becomes available after the guarded swap executes.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visual flow diagram */}
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-emerald-400/10 bg-emerald-400/[0.03] p-5">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <span className="text-xs font-semibold text-cyan-200">EG</span>
              </div>
              <span className="text-[10px] text-slate-500">Guard</span>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-400" />
            <div className="flex h-8 items-center rounded-full bg-emerald-400/10 px-3">
              <span className="text-xs font-medium text-emerald-200">Sweep</span>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                <Check className="h-4 w-4 text-emerald-300" />
              </div>
              <span className="text-[10px] text-slate-500">Vault</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-outline rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Returned to vault</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">{formatUsd(settlement.amountReturnedUsd)}</p>
            </div>
            <div className="glass-outline rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session PnL</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatUsd(settlement.pnlUsd)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" className="font-mono normal-case tracking-normal">
                {settlement.txRef}
              </Badge>
            </div>
            <div className="glass-outline rounded-3xl p-4 text-sm leading-6 text-slate-300">{settlement.summary}</div>
          </div>
        </div>
      )}

      {interactive ? (
        <Button
          onClick={() => void settleToVault()}
          disabled={executionWallet.status !== "executed" || isSettling}
        >
          {isSettling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Settling On-Chain…
            </>
          ) : executionWallet.status === "executed" ? (
            "Settle Session On-Chain"
          ) : (
            "Execute The Swap Before Settlement"
          )}
        </Button>
      ) : null}
    </SurfaceCard>
  );
}
