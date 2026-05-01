"use client";

import { SectionTitle } from "@noxpilot/ui";
import { DEFAULT_NETWORK } from "@noxpilot/shared";
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
import { NextActionBanner } from "@/components/noxpilot/next-action-banner";
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
        title="Guided Operator Flow"
        description={`Move through one clear live path on ${DEFAULT_NETWORK}: connect and verify, set a private policy and rank candidates, then execute and close the run.`}
      />

      <NextActionBanner surface="demo" />

      <DemoWizard>
        {/* Step 1: Connect Wallet */}
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            Connect the wallet that owns the deployed PolicyVault and administers ExecutionGuard on Arbitrum Sepolia Testnet.
          </p>
          <WalletConnectButton />
        </div>

        {/* Step 2: Verify setup */}
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            This confirms the live operator identity, registers the execution wallet if needed, and wires the execution guard plus confidential wrapper support.
          </p>
          <Button
            variant="secondary"
            onClick={() => void initializeTopology()}
            disabled={!canInitializeTopology}
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying On-Chain…
              </>
            ) : !walletConnected ? (
              "Connect Wallet First"
            ) : !networkSupported ? (
              "Switch to Arbitrum Sepolia Testnet"
            ) : !liveConfigReady ? (
              "Finish Live Contract Setup"
            ) : (
              <>
                <Settings2 className="mr-2 h-4 w-4" />
                Verify Live Setup
              </>
            )}
          </Button>
        </div>

        {/* Step 3: Policy Setup & Encryption */}
        <div className="space-y-6">
          <PolicySetupForm />
          <EncryptedPolicySummaryCard interactive />
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
            This prepares the confidential approval data, verifies it on-chain, quotes the swap, and executes one real exact-input trade through the guard.
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
              "Execute Guarded Live Swap"
            ) : (
              "Complete Funding Step First"
            )}
          </Button>
        </div>

        {/* Step 9: Wrap / Reveal / Unwrap */}
        <ConfidentialPositionCard interactive />

        {/* Step 10: Settlement */}
        <SettlementCard interactive />
      </DemoWizard>

      <div id="recent-activity" className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ActivityTimeline />
        <SafetyControlsPanel />
      </div>
    </div>
  );
}
