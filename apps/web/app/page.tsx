import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { APP_NAME, TRUST_PILLARS } from "@noxpilot/shared";
import { MetricPill, SectionTitle, SurfaceCard } from "@noxpilot/ui";
import { WalletConnectButton } from "@/components/noxpilot/wallet-connect-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PILLAR_ICONS = [WalletCards, Sparkles, LockKeyhole, ShieldCheck] as const;

const DEMO_STEPS = [
  { num: 1, label: "Connect wallet", sub: "Arbitrum Sepolia" },
  { num: 2, label: "Initialize topology", sub: "Verify contracts" },
  { num: 3, label: "Encrypt & save policy", sub: "Nox handles" },
  { num: 4, label: "Trigger research", sub: "Live market data" },
  { num: 5, label: "Evaluate decision", sub: "Policy checks" },
  { num: 6, label: "Fund session", sub: "Bounded on-chain" },
  { num: 7, label: "Execute swap", sub: "One real trade" },
  { num: 8, label: "Settle & close", sub: "Sweep to vault" }
];

export default function HomePage() {
  return (
    <div className="container space-y-16 py-12 md:py-16">
      {/* ── Hero ── */}
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-8 animate-fade-slide-up">
          <Badge variant="default">Hybrid TypeScript + Python architecture</Badge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-white md:text-6xl">
              AI crypto execution without handing the keys.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              {APP_NAME} separates your vault capital from operational execution, encrypts strategy thresholds, and gives AI only bounded one-session authority that you can revoke anytime.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/demo">
                Start the demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <WalletConnectButton />
            <MetricPill label="Positioning" value="Trust-minimized automation" accent="emerald" />
          </div>
        </div>

        {/* ── Architecture Diagram ── */}
        <SurfaceCard className="space-y-4">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">Architecture overview</p>
          <div className="flex flex-col items-center gap-3 py-4">
            {/* Vault */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                <WalletCards className="h-5 w-5 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Vault Wallet</p>
                <p className="text-xs text-slate-400">Capital isolated from execution</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-0.5 bg-gradient-to-b from-emerald-400/40 to-cyan-400/40" />
              <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Bounded session</div>
              <div className="h-6 w-0.5 bg-gradient-to-b from-cyan-400/40 to-violet-400/40" />
            </div>
            {/* Execution */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <ShieldCheck className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Execution Guard</p>
                <p className="text-xs text-slate-400">Policy-bounded swap execution</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-0.5 bg-gradient-to-b from-violet-400/40 to-amber-400/40" />
              <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Research input</div>
              <div className="h-6 w-0.5 bg-gradient-to-b from-amber-400/40 to-violet-400/20" />
            </div>
            {/* Agent */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
                <Sparkles className="h-5 w-5 text-violet-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Research Agent</p>
                <p className="text-xs text-slate-400">Informs — does not control capital</p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      {/* ── Trust Pillars ── */}
      <section className="space-y-6">
        <SectionTitle
          eyebrow="Trust model"
          title="Four pillars of bounded authority"
          description="Each component in NoxPilot has a limited, well-defined role. No single component can drain the vault or bypass the operator."
        />

        <div className="grid gap-6 lg:grid-cols-4">
          {TRUST_PILLARS.map((pillar, idx) => {
            const Icon = PILLAR_ICONS[idx];
            const colors = [
              { border: "border-emerald-400/20", bg: "bg-emerald-400/10", text: "text-emerald-200" },
              { border: "border-cyan-400/20", bg: "bg-cyan-400/10", text: "text-cyan-200" },
              { border: "border-violet-400/20", bg: "bg-violet-400/10", text: "text-violet-200" },
              { border: "border-amber-400/20", bg: "bg-amber-400/10", text: "text-amber-200" }
            ][idx]!;
            return (
              <SurfaceCard key={pillar.title} className="space-y-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${colors.border} ${colors.bg}`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-white">{pillar.title}</h3>
                <p className="text-sm leading-6 text-slate-300">{pillar.description}</p>
              </SurfaceCard>
            );
          })}
        </div>
      </section>

      {/* ── Demo Path ── */}
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="space-y-5">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">How it works</p>
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <p>Capital stays in the vault until a bounded session is approved.</p>
            <p>Execution logic respects confidential policy thresholds.</p>
            <p>The agent can act only within budget, token, and session limits.</p>
            <p>Main capital remains isolated from operational execution.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/trust">Learn about the trust model <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">Demo path — 8 steps</p>
          <div className="space-y-2">
            {DEMO_STEPS.map((step, index) => (
              <div key={step.num} className="flex items-center gap-3">
                {/* Step number with connector */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-semibold text-cyan-200">
                    {step.num}
                  </div>
                  {index < DEMO_STEPS.length - 1 ? (
                    <div className="h-3 w-0.5 bg-cyan-400/15" />
                  ) : null}
                </div>
                <div className="glass-outline flex-1 rounded-2xl p-3 text-sm">
                  <span className="text-white">{step.label}</span>
                  <span className="ml-2 text-slate-500">{step.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <Button asChild>
            <Link href="/demo">Start the demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </SurfaceCard>
      </section>
    </div>
  );
}
