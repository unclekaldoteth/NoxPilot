"use client";

import { EyeOff, Lock, Unlock } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function EncryptedPolicySummaryCard() {
  const { encryptedPolicy } = useNoxPilot();

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10">
            <EyeOff className="h-5 w-5 text-violet-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Confidential Policy</h3>
            <p className="text-sm leading-6 text-slate-300">Public metadata is readable. Sensitive thresholds (budget, confidence, slippage) are encrypted as Nox handles.</p>
          </div>
        </div>
        {encryptedPolicy ? <MetricPill label="Handles" value={encryptedPolicy.encryptedFields.length.toString()} accent="amber" /> : null}
      </div>

      {!encryptedPolicy ? (
        <div className="glass-outline rounded-3xl p-4 text-sm text-slate-400">No policy stored yet. Save a policy to generate handle references.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {encryptedPolicy.publicSummary.allowedTokens.map((token) => (
              <Badge key={token} variant="muted">
                {token}
              </Badge>
            ))}
            <Badge variant="default">{encryptedPolicy.publicSummary.allowedProtocol}</Badge>
            <Badge variant={encryptedPolicy.publicSummary.autoExecuteEnabled ? "warning" : "muted"}>
              {encryptedPolicy.publicSummary.autoExecuteEnabled ? "Auto execute" : "Manual review"}
            </Badge>
          </div>

          {/* Public vs encrypted fields */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Field privacy</p>
            <div className="grid gap-2">
              {encryptedPolicy.encryptedFields.map((field) => (
                <div key={field.field} className="glass-outline flex items-center justify-between rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-violet-300" />
                    <div>
                      <p className="text-sm font-medium capitalize text-white">{field.field.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-slate-500">{field.preview}</p>
                    </div>
                  </div>
                  <Badge variant={field.mode === "live" ? "success" : "warning"}>{truncateAddress(field.handle)}</Badge>
                </div>
              ))}
              {/* Public fields indicator */}
              <div className="glass-outline flex items-center gap-3 rounded-2xl p-3">
                <Unlock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Tokens, protocol, expiry, trade limit</p>
                  <p className="text-xs text-slate-500">Public — visible for operator review</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}
