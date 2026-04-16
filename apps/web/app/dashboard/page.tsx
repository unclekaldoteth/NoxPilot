"use client";

import { SectionTitle } from "@noxpilot/ui";
import { SystemHealthBanner } from "@/components/noxpilot/system-health-banner";
import { ActivityTimeline } from "@/components/noxpilot/activity-timeline";
import { ConfidentialPositionCard } from "@/components/noxpilot/confidential-position-card";
import { EncryptedPolicySummaryCard } from "@/components/noxpilot/encrypted-policy-summary-card";
import { ExecutionDecisionCard } from "@/components/noxpilot/execution-decision-card";
import { ExecutionWalletCard } from "@/components/noxpilot/execution-wallet-card";
import { FundingCard } from "@/components/noxpilot/funding-card";
import { ResearchRecommendationCard } from "@/components/noxpilot/research-recommendation-card";
import { SafetyControlsPanel } from "@/components/noxpilot/safety-controls-panel";
import { SettlementCard } from "@/components/noxpilot/settlement-card";
import { SystemStatusCard } from "@/components/noxpilot/system-status-card";
import { VaultOverviewCard } from "@/components/noxpilot/vault-overview-card";

export default function DashboardPage() {
  return (
    <div className="container space-y-8 py-12">
      <SectionTitle
        eyebrow="Operator dashboard"
        title="Bounded Execution at a Glance"
        description="Read-only monitoring view — vault capital, session status, policy state, and research output. Use the Demo page to interact."
      />

      {/* ── System Health ── */}
      <SystemHealthBanner />

      {/* ── Section 1: Wallets ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallets & Balances</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <VaultOverviewCard />
          <ExecutionWalletCard />
        </div>
      </div>

      {/* ── Section 2: Policy & Research ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Policy & Research</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <EncryptedPolicySummaryCard />
          <ResearchRecommendationCard />
        </div>
      </div>

      {/* ── Section 3: Execution & Session ── */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Execution & Session</p>
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

      {/* ── Section 4: Safety & Activity ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ActivityTimeline />
        <SafetyControlsPanel />
      </div>
    </div>
  );
}
