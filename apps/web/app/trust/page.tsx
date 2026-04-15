import Link from "next/link";
import { ArrowRight, Lock, Shield, Wallet } from "lucide-react";
import { SectionTitle, SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { TrustArchitectureComparison } from "@/components/noxpilot/trust-architecture-comparison";

const principles = [
  {
    num: 1,
    title: "Capital isolation",
    desc: "Main capital remains in the vault. The operational wallet only receives bounded session funding. The agent never has direct access to the vault.",
    color: "border-emerald-400/20 bg-emerald-400/[0.04]",
    icon: <Wallet className="h-6 w-6 text-emerald-200" />
  },
  {
    num: 2,
    title: "Confidential policy",
    desc: "Budget and confidence thresholds are stored as encrypted Nox handles. The contracts verify these confidentially — no one sees the raw values on-chain.",
    color: "border-violet-400/20 bg-violet-400/[0.04]",
    icon: <Lock className="h-6 w-6 text-violet-200" />
  },
  {
    num: 3,
    title: "Revocable automation",
    desc: "The operator can pause the entire system or revoke any active session instantly. AI has bounded authority that expires automatically.",
    color: "border-cyan-400/20 bg-cyan-400/[0.04]",
    icon: <Shield className="h-6 w-6 text-cyan-200" />
  }
];

export default function TrustPage() {
  return (
    <div className="container space-y-12 py-12">
      <SectionTitle
        eyebrow="Trust boundary"
        title="Why the trust model matters"
        description="NoxPilot is not an unlimited-autonomy agent. The design is bounded authority, confidential thresholds, isolated capital, and instant revocability."
      />

      <TrustArchitectureComparison />

      {/* ── Principles ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {principles.map((p) => (
          <SurfaceCard key={p.num} className={`space-y-4 ${p.color}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                {p.icon}
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Principle {p.num}</span>
                <h3 className="text-xl font-semibold text-white">{p.title}</h3>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-300">{p.desc}</p>
          </SurfaceCard>
        ))}
      </div>

      {/* ── Money Flow ── */}
      <SurfaceCard className="space-y-6">
        <SectionTitle
          eyebrow="Capital flow"
          title="How money moves through NoxPilot"
          description="Follow the path from vault to guard to settlement."
        />
        <div className="flex flex-col items-center gap-0 py-4">
          {[
            { label: "Vault Wallet", sub: "Capital stored here, untouched by agent", color: "border-emerald-400/20" },
            { label: "PolicyVault.openSession()", sub: "Only bounded amount approved", color: "border-cyan-400/20" },
            { label: "ExecutionGuard", sub: "Receives session asset, enforces all limits", color: "border-cyan-400/20" },
            { label: "executeExactInputSingle()", sub: "One real swap with confidence proof", color: "border-amber-400/20" },
            { label: "settleSessionAssets()", sub: "Sweep remaining back to vault", color: "border-violet-400/20" },
            { label: "Vault Wallet", sub: "Capital returns — session closed", color: "border-emerald-400/20" }
          ].map((step, i, arr) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-full max-w-md rounded-2xl border ${step.color} bg-white/[0.02] p-4 text-center`}>
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="text-xs text-slate-400">{step.sub}</p>
              </div>
              {i < arr.length - 1 ? (
                <div className="h-8 w-0.5 bg-gradient-to-b from-white/10 to-white/5" />
              ) : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className="text-center">
        <Button asChild size="lg">
          <Link href="/demo">
            Try the demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
