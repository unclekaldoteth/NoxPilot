"use client";

import { ShieldCheck, ShieldX } from "lucide-react";
import { CheckItem, MetricPill, SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function ExecutionDecisionCard({ interactive = false }: { interactive?: boolean }) {
  const { decision, evaluateDecision } = useNoxPilot();

  // Build structured checks when we have enough data
  const checks = decision
    ? decision.allowed
      ? [
          { label: "Token on allowed list", passed: true },
          { label: "Confidence above threshold", passed: true },
          { label: "Budget available", passed: true },
          { label: "Session limits intact", passed: true }
        ]
      : decision.reasons.map((reason) => ({ label: reason, passed: false }))
    : [];

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${
            decision?.allowed
              ? "border-emerald-400/25 bg-emerald-400/10"
              : "border-white/10 bg-white/5"
          }`}>
            {decision?.allowed ? <ShieldCheck className="h-5 w-5 text-emerald-200" /> : <ShieldX className="h-5 w-5 text-amber-200" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Execution Decision</h3>
            <p className="text-sm leading-6 text-slate-300">Checks the research output against your policy constraints before allowing any on-chain action.</p>
          </div>
        </div>
        {decision ? (
          <MetricPill label="Action" value={decision.action} accent={decision.allowed ? "emerald" : "amber"} />
        ) : null}
      </div>

      {!decision ? (
        <div className="glass-outline rounded-3xl p-4 text-sm text-slate-400">No decision yet. Click evaluate once you have a research recommendation.</div>
      ) : (
        <>
          {/* Big verdict */}
          <div className={`flex items-center gap-4 rounded-3xl border p-5 ${
            decision.allowed
              ? "border-emerald-400/15 bg-emerald-400/[0.04]"
              : "border-amber-400/15 bg-amber-400/[0.04]"
          }`}>
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
              decision.allowed
                ? "bg-emerald-400/15 ring-2 ring-emerald-400/25"
                : "bg-amber-400/15 ring-2 ring-amber-400/25"
            }`}>
              {decision.allowed ? (
                <ShieldCheck className="h-7 w-7 text-emerald-300" />
              ) : (
                <ShieldX className="h-7 w-7 text-amber-300" />
              )}
            </div>
            <div>
              <p className={`text-lg font-semibold ${decision.allowed ? "text-emerald-200" : "text-amber-200"}`}>
                {decision.allowed ? "Execution Approved" : "Execution Blocked"}
              </p>
              <p className="text-sm text-slate-300">
                {decision.allowed
                  ? `${decision.token} cleared all policy checks. Ready for bounded session.`
                  : decision.reasons[0] ?? "Execution is blocked by policy constraints."}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={decision.allowed ? "success" : "warning"}>{decision.allowed ? "Allowed" : "Blocked"}</Badge>
            {decision.token ? <Badge variant="muted">{decision.token}</Badge> : null}
            <Badge variant="muted">Funding target {formatUsd(decision.requiredFundingUsd)}</Badge>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {checks.map((check) => (
              <CheckItem key={check.label} passed={check.passed}>
                {check.label}
              </CheckItem>
            ))}
          </div>
        </>
      )}

      {interactive ? <Button onClick={() => evaluateDecision()}>{decision ? "Re-evaluate decision" : "Evaluate decision"}</Button> : null}
    </SurfaceCard>
  );
}
