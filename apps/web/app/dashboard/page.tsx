"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionTitle, SurfaceCard } from "@noxpilot/ui";
import { SystemHealthBanner } from "@/components/noxpilot/system-health-banner";
import { ActivityTimeline } from "@/components/noxpilot/activity-timeline";
import { ConfidentialPositionCard } from "@/components/noxpilot/confidential-position-card";
import { EncryptedPolicySummaryCard } from "@/components/noxpilot/encrypted-policy-summary-card";
import { ExecutionDecisionCard } from "@/components/noxpilot/execution-decision-card";
import { ExecutionWalletCard } from "@/components/noxpilot/execution-wallet-card";
import { FundingCard } from "@/components/noxpilot/funding-card";
import { ResearchRecommendationCard } from "@/components/noxpilot/research-recommendation-card";
import { SettlementCard } from "@/components/noxpilot/settlement-card";
import { SystemStatusCard } from "@/components/noxpilot/system-status-card";
import { VaultOverviewCard } from "@/components/noxpilot/vault-overview-card";
import { NextActionBanner } from "@/components/noxpilot/next-action-banner";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="container space-y-8 py-12">
      <SectionTitle
        eyebrow="Operator dashboard"
        title="Live Run Status"
        description="Read-only monitoring for the current live flow. Use the guided demo to take actions; use this page to review readiness, state, and outcomes."
      />

      <NextActionBanner surface="dashboard" />

      {/* ── System Health ── */}
      <SystemHealthBanner />

      <SurfaceCard className="flex flex-col gap-4 rounded-[28px] border-white/10 bg-white/[0.03] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Read-only by design</p>
          <h2 className="text-xl font-semibold text-white">Use this page to understand the run, not to operate it.</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            The dashboard summarizes what matters right now. When you need to connect the wallet, save a policy, run research, trade, or use emergency controls, continue in the guided demo flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/demo">
              Continue in Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/trust">Review trust model</Link>
          </Button>
        </div>
      </SurfaceCard>

      {/* ── Section 1: Wallets ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">1. Readiness & capital</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <VaultOverviewCard />
          <ExecutionWalletCard />
        </div>
      </div>

      {/* ── Section 2: Policy & Research ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">2. Private policy & recommendation</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <EncryptedPolicySummaryCard />
          <ResearchRecommendationCard />
        </div>
      </div>

      {/* ── Section 3: Execution & Session ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">3. Decision, execution, and closeout</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <ExecutionDecisionCard />
          <FundingCard />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ConfidentialPositionCard />
          <SettlementCard />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SystemStatusCard />
        </div>
      </div>

      {/* ── Section 4: Activity ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ActivityTimeline />
        <SurfaceCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Actions live in demo</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Need to change something?</h3>
          </div>
          <p className="text-sm leading-6 text-slate-300">
            Session funding, guarded execution, confidential wrapping, settlement, pause, and revoke controls are intentionally kept in the guided demo so the operator always has one clear next action.
          </p>
          <Button asChild variant="secondary">
            <Link href="/demo#step-connect">Open guided flow</Link>
          </Button>
        </SurfaceCard>
      </div>
    </div>
  );
}
