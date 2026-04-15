import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { SurfaceCard } from "@noxpilot/ui";
import { Badge } from "@/components/ui/badge";

const unsafeItems = [
  { text: "One hot wallet stores capital and executes trades.", severity: "high" },
  { text: "Policy thresholds are exposed or loosely managed.", severity: "medium" },
  { text: "Agent authority is broad and hard to revoke.", severity: "high" },
  { text: "Users cannot clearly inspect trust boundaries.", severity: "medium" }
];

const boundedItems = [
  { text: "Vault capital remains isolated from operational execution.", check: true },
  { text: "Execution wallet receives only bounded session funding.", check: true },
  { text: "Policy thresholds stay confidential through handle references.", check: true },
  { text: "Pause and revoke controls are explicit in the operator UX.", check: true }
];

export function TrustArchitectureComparison() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Unsafe Model ── */}
      <SurfaceCard className="space-y-5 border-rose-400/15">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/10">
            <AlertTriangle className="h-5 w-5 text-rose-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Unsafe autonomous model</h3>
            <p className="text-sm leading-6 text-slate-300">Fast to demo, weak on trust.</p>
          </div>
        </div>

        <div className="space-y-2">
          {unsafeItems.map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 rounded-2xl border border-rose-400/10 bg-rose-400/[0.03] p-4 text-sm"
            >
              <XCircle className={`h-5 w-5 shrink-0 ${item.severity === "high" ? "text-rose-400" : "text-rose-300/60"}`} />
              <span className="text-slate-200">{item.text}</span>
              {item.severity === "high" ? (
                <Badge variant="danger" className="ml-auto shrink-0">High risk</Badge>
              ) : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* ── NoxPilot Model ── */}
      <SurfaceCard className="space-y-5 border-emerald-400/15">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">NoxPilot bounded confidential model</h3>
            <p className="text-sm leading-6 text-slate-300">Trust-minimized automation designed for operator control.</p>
          </div>
        </div>

        <div className="space-y-2">
          {boundedItems.map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4 text-sm"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-slate-200">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="success">
            <Wallet className="mr-2 h-3.5 w-3.5" />
            Isolated execution wallet
          </Badge>
          <Badge variant="default">
            <Lock className="mr-2 h-3.5 w-3.5" />
            Confidential policy
          </Badge>
        </div>
      </SurfaceCard>
    </div>
  );
}
