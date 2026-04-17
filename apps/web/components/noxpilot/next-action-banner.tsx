"use client";

import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { getNextOperatorAction } from "@/lib/operator-flow";

export function NextActionBanner({ surface = "demo" }: { surface?: "demo" | "dashboard" }) {
  const {
    walletConnected,
    networkSupported,
    liveConfigReady,
    topologyReady,
    encryptedPolicy,
    tokenDiscovery,
    recommendation,
    decision,
    executionWallet,
    confidentialPosition,
    settlement
  } = useNoxPilot();

  const action = getNextOperatorAction({
    walletConnected,
    networkSupported,
    liveConfigReady,
    topologyReady,
    encryptedPolicyReady: Boolean(encryptedPolicy),
    tokenDiscoveryReady: Boolean(tokenDiscovery),
    recommendationReady: Boolean(recommendation),
    decisionReady: Boolean(decision),
    executionWalletStatus: executionWallet.status,
    sessionActive: executionWallet.sessionActive,
    confidentialPosition,
    settlementReady: Boolean(settlement)
  });

  const href =
    surface === "dashboard"
      ? `/demo#step-${action.stepKey}`
      : action.title === "Review the completed run"
        ? "#recent-activity"
        : `#step-${action.stepKey}`;
  const buttonLabel =
    surface === "dashboard"
      ? "Continue in Demo"
      : action.buttonLabel;

  return (
    <section className="rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(14,165,233,0.03),rgba(2,6,23,0.72))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{action.phaseLabel}</Badge>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Next action
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{action.title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">{action.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">
              Guided flow
            </span>
            Follow one step at a time instead of scanning the entire system.
          </div>
          <Button asChild size="lg">
            <Link href={href}>
              {buttonLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {surface === "dashboard" ? (
            <Button asChild variant="secondary" size="lg">
              <Link href="/trust">
                <Compass className="mr-2 h-4 w-4" />
                Trust model
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
