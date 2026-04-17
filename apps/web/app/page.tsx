import Link from "next/link";
import { ArrowRight, LockKeyhole, Search, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { APP_NAME, TRUST_PILLARS } from "@noxpilot/shared";
import { MetricPill, SectionTitle, SurfaceCard } from "@noxpilot/ui";
import { WalletConnectButton } from "@/components/noxpilot/wallet-connect-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PILLAR_ICONS = [WalletCards, Sparkles, LockKeyhole, ShieldCheck] as const;

const DEMO_STEPS = [
  { num: 1, label: "Connect owner wallet", sub: "Arbitrum Sepolia" },
  { num: 2, label: "Discover and rank a token", sub: "Base, BNB, Solana" },
  { num: 3, label: "Execute one bounded swap", sub: "Guarded session" },
  { num: 4, label: "Wrap the result confidentially", sub: "Nox asset" }
];

const DEMO_PHASES = [
  {
    title: "Connect & Verify",
    description: "Connect the deployed owner wallet and verify the live contract wiring before any action unlocks."
  },
  {
    title: "Set Policy & Research",
    description: "Encrypt the private policy, discover candidates by category, and rank the top pick with live data."
  },
  {
    title: "Execute & Close",
    description: "Open one bounded session, perform a guarded swap, wrap the acquired ERC-20, and close the run."
  }
];

export default function HomePage() {
  return (
    <div className="container space-y-16 py-12 md:py-16">
      {/* ── Hero ── */}
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-8 animate-fade-slide-up">
          <Badge variant="default">Connect wallet → discover token → bounded swap → wrap confidentially</Badge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Let the agent find the trade. Keep the authority bounded.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              {APP_NAME} guides you through one clear live flow: connect the owner wallet, discover a token, execute one guarded swap, then turn the acquired ERC-20 into a confidential Nox position.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/demo">
                Open guided demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <WalletConnectButton />
            <MetricPill label="Outcome" value="Bounded confidential execution" accent="emerald" />
          </div>
        </div>

        {/* ── Architecture Diagram ── */}
        <SurfaceCard className="space-y-4">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">3-minute operator path</p>
          <div className="flex flex-col items-center gap-3 py-4">
            {/* Vault */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                <WalletCards className="h-5 w-5 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">1. Connect Owner Wallet</p>
                <p className="text-xs text-slate-400">Verify the live operator identity</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-0.5 bg-gradient-to-b from-emerald-400/40 to-cyan-400/40" />
              <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Discover and score</div>
              <div className="h-6 w-0.5 bg-gradient-to-b from-cyan-400/40 to-violet-400/40" />
            </div>
            {/* Execution */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <Search className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">2. Discover Best Candidate</p>
                <p className="text-xs text-slate-400">Category search plus live ranking</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-0.5 bg-gradient-to-b from-violet-400/40 to-amber-400/40" />
              <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Guarded execution</div>
              <div className="h-6 w-0.5 bg-gradient-to-b from-amber-400/40 to-violet-400/20" />
            </div>
            {/* Agent */}
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
                <ShieldCheck className="h-5 w-5 text-violet-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">3. Execute One Bounded Swap</p>
                <p className="text-xs text-slate-400">Session-limited on-chain authority</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-0.5 bg-gradient-to-b from-violet-400/40 to-amber-400/40" />
              <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Protect the outcome</div>
              <div className="h-6 w-0.5 bg-gradient-to-b from-amber-400/40 to-emerald-400/20" />
            </div>
            <div className="flex w-full max-w-xs items-center gap-3 rounded-3xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <LockKeyhole className="h-5 w-5 text-amber-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">4. Wrap Confidentially</p>
                <p className="text-xs text-slate-400">Turn the result into a private Nox asset</p>
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
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">What the operator controls</p>
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <p>The vault remains isolated until you open a single bounded session.</p>
            <p>The agent can suggest and score, but it cannot bypass budget, token, or wrapper constraints.</p>
            <p>Private thresholds stay encrypted, and the acquired ERC-20 can be wrapped into a confidential asset after purchase.</p>
            <p>The full run resolves into a clear end state: review, reveal if needed, then settle back to the vault.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/trust">Learn about the trust model <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">Guided demo flow</p>
          <div className="space-y-3">
            {DEMO_PHASES.map((phase, index) => (
              <div key={phase.title} className="glass-outline rounded-3xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-semibold text-cyan-200">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{phase.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{phase.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_STEPS.map((step) => (
              <div key={step.num} className="glass-outline rounded-2xl p-3 text-sm">
                <span className="font-medium text-white">{step.label}</span>
                <span className="ml-2 text-slate-500">{step.sub}</span>
              </div>
            ))}
          </div>
          <Button asChild>
            <Link href="/demo">Start the guided demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </SurfaceCard>
      </section>
    </div>
  );
}
