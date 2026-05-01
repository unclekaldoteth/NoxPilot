"use client";

import { Radar, ShieldCheck } from "lucide-react";
import { DotStatus, SurfaceCard } from "@noxpilot/ui";
import { DEFAULT_NETWORK } from "@noxpilot/shared";
import { Badge } from "@/components/ui/badge";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function SystemStatusCard() {
  const { mode, walletConnected, walletSource, liveConfigReady, noxClientConfigReady, networkSupported, systemPaused, executionWallet } =
    useNoxPilot();

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Radar className="h-5 w-5 text-slate-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">System Status</h3>
            <p className="text-sm leading-6 text-slate-300">High-level health for the {DEFAULT_NETWORK} live run: environment, wallet readiness, and session state.</p>
          </div>
        </div>
        <Badge variant={systemPaused ? "danger" : "success"}>{systemPaused ? "Paused" : "Operational"}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-outline rounded-3xl p-4">
          <DotStatus tone={mode === "live" ? "success" : "warning"}>{mode === "live" ? "Live judged mode" : "Dev mock mode"}</DotStatus>
          <p className="mt-2 text-sm text-slate-400">
            {liveConfigReady ? "Contracts, router, token registry, and wrapper settings are configured for the live path." : "The live contract or DEX configuration is still incomplete."}
          </p>
        </div>
        <div className="glass-outline rounded-3xl p-4">
          <DotStatus tone={walletConnected && networkSupported ? "success" : "warning"}>
            {walletConnected ? `${walletSource} wallet connected` : "Wallet disconnected"}
          </DotStatus>
          <p className="mt-2 text-sm text-slate-400">
            {walletConnected
              ? networkSupported
                ? noxClientConfigReady
                  ? "Wallet, network, and private-config plumbing are ready for the guarded live flow."
                  : "Wallet is connected, but the public Nox configuration is still missing."
                : `Switch the connected wallet to ${DEFAULT_NETWORK}.`
              : "Connect the owner wallet used for the deployed live contracts."}
          </p>
        </div>
      </div>

      <div className="glass-outline flex items-center justify-between rounded-3xl p-4 text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <span>{executionWallet.sessionActive ? "A bounded execution session is active." : "No execution session is active."}</span>
        </div>
        <Badge variant="muted">{executionWallet.sessionActive ? "Funding isolated" : "Awaiting approval"}</Badge>
      </div>
    </SurfaceCard>
  );
}
