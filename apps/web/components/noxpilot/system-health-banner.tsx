"use client";

import { CheckCircle2, Radio, ShieldAlert, XCircle } from "lucide-react";
import { useNoxPilot } from "@/components/providers/app-state-provider";

type HealthStatus = "healthy" | "degraded" | "critical";

export function SystemHealthBanner() {
  const {
    walletConnected,
    networkSupported,
    liveConfigReady,
    noxClientConfigReady,
    topologyReady,
    executionWallet,
    systemPaused
  } =
    useNoxPilot();

  const checks = [
    { label: "Wallet", ok: walletConnected },
    { label: "Network", ok: networkSupported },
    { label: "Contracts", ok: liveConfigReady },
    { label: "Topology", ok: topologyReady },
    { label: "Nox Config", ok: noxClientConfigReady },
    { label: "Not Paused", ok: !systemPaused }
  ];

  const passCount = checks.filter((c) => c.ok).length;
  const status: HealthStatus =
    passCount === checks.length ? "healthy" : passCount >= checks.length - 2 ? "degraded" : "critical";

  const statusConfig = {
    healthy: {
      bg: "border-emerald-400/15 bg-emerald-400/[0.04]",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      text: "All systems operational",
      tone: "success" as const
    },
    degraded: {
      bg: "border-amber-400/15 bg-amber-400/[0.04]",
      icon: <Radio className="h-5 w-5 text-amber-400" />,
      text: "Partial readiness — some components need attention",
      tone: "warning" as const
    },
    critical: {
      bg: "border-rose-400/15 bg-rose-400/[0.04]",
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
      text: "System not ready — connect wallet and configure contracts",
      tone: "error" as const
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex flex-col gap-4 rounded-[24px] border p-5 sm:flex-row sm:items-center sm:justify-between ${config.bg}`}>
      <div className="flex items-center gap-3">
        {config.icon}
        <div>
          <p className="text-sm font-medium text-white">{config.text}</p>
          <p className="text-xs text-slate-400">
            {executionWallet.sessionActive
              ? "Bounded session is active"
              : executionWallet.status === "executed"
                ? "Swap executed — awaiting settlement"
                : "No active session"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              check.ok
                ? "border-emerald-400/20 text-emerald-300"
                : "border-rose-400/20 text-rose-300"
            }`}
          >
            {check.ok ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}
