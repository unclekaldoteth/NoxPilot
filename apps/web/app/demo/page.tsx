"use client";

import { SectionTitle } from "@noxpilot/ui";
import { DemoWizard } from "@/components/noxpilot/demo-wizard";
import { WalletConnectButton } from "@/components/noxpilot/wallet-connect-button";
import { Button } from "@/components/ui/button";
import { PolicySetupForm } from "@/components/noxpilot/policy-setup-form";
import { EncryptedPolicySummaryCard } from "@/components/noxpilot/encrypted-policy-summary-card";
import { TokenDiscoveryCard } from "@/components/noxpilot/token-discovery-card";
import { ResearchRecommendationCard } from "@/components/noxpilot/research-recommendation-card";
import { ExecutionDecisionCard } from "@/components/noxpilot/execution-decision-card";
import { FundingCard } from "@/components/noxpilot/funding-card";
import { ConfidentialPositionCard } from "@/components/noxpilot/confidential-position-card";
import { SettlementCard } from "@/components/noxpilot/settlement-card";
import { SafetyControlsPanel } from "@/components/noxpilot/safety-controls-panel";
import { ActivityTimeline } from "@/components/noxpilot/activity-timeline";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { Loader2, Settings2 } from "lucide-react";

export default function DemoPage() {
  const {
    initializeTopology,
    executeTrade,
    executionWallet,
    isInitializing,
    isExecuting,
    walletConnected,
    networkSupported,
    liveConfigReady
  } = useNoxPilot();

  const canInitializeTopology = walletConnected && networkSupported && liveConfigReady && !isInitializing;

  return (
    <div className="container space-y-8 py-12">
      <SectionTitle
        eyebrow="Hackathon demo"
        title="NoxPilot Operator Flow"
        description="Walk through the complete bounded execution flow step by step. Each step unlocks after the previous one completes."
      />

      <DemoWizard>
        {/* Step 1: Connect Wallet */}
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            Connect a wallet that owns the deployed PolicyVault and administers ExecutionGuard on Arbitrum Sepolia.
          </p>
          <WalletConnectButton />
        </div>

        {/* Step 2: Initialize Topology */}
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            This verifies you own the PolicyVault, registers the execution wallet if needed, and wires the ExecutionGuard controller.
          </p>
          <Button
            variant="secondary"
            onClick={() => void initializeTopology()}
            disabled={!canInitializeTopology}
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing On-Chain…
              </>
            ) : !walletConnected ? (
              "Connect Wallet First"
            ) : !networkSupported ? (
              "Switch to Arbitrum Sepolia"
            ) : !liveConfigReady ? (
              "Set Live Contract Env First"
            ) : (
              <>
                <Settings2 className="mr-2 h-4 w-4" />
                Initialize Live Topology
              </>
            )}
          </Button>
        </div>

        {/* Step 3: Policy Setup & Encryption */}
        <div className="space-y-6">
          <PolicySetupForm />
          <EncryptedPolicySummaryCard />
        </div>

        {/* Step 4: Discover Tokens */}
        <TokenDiscoveryCard interactive />

        {/* Step 5: Research */}
        <ResearchRecommendationCard interactive />

        {/* Step 6: Execution Decision */}
        <ExecutionDecisionCard interactive />

        {/* Step 7: Fund Session */}
        <FundingCard interactive />

        {/* Step 8: Execute Swap */}
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            This prepares a confidential confidence-approval handle, verifies it on-chain, quotes the swap, and executes one real exact-input swap.
          </p>
          <Button
            onClick={() => void executeTrade()}
            disabled={executionWallet.status !== "funded" || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing On-Chain…
              </>
            ) : executionWallet.status === "funded" ? (
              "Execute Bounded Live Swap"
            ) : (
              "Complete Funding Step First"
            )}
          </Button>
        </div>

        {/* Step 9: Wrap / Reveal / Unwrap */}
        <ConfidentialPositionCard interactive />

        {/* Step 10: Settlement */}
        <SettlementCard interactive />

        {/* Step 11: Safety Controls */}
        <SafetyControlsPanel />
      </DemoWizard>

      {/* Activity Timeline sits below the wizard */}
      <ActivityTimeline />
    </div>
  );
}
