"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Radio, ShieldAlert, XCircle } from "lucide-react";
import type { AgentHealthResponse } from "@noxpilot/shared";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { fetchAgentHealth } from "@/lib/research";

type HealthStatus = "healthy" | "degraded" | "critical";
type AgentHealthState =
  | { status: "checking"; data: null; message: "Checking research agent..." }
  | { status: "ok"; data: AgentHealthResponse; message: string }
  | { status: "error"; data: null; message: string };

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
  const [agentHealth, setAgentHealth] = useState<AgentHealthState>({
    status: "checking",
    data: null,
    message: "Checking research agent..."
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAgent() {
      try {
        const result = await fetchAgentHealth();
        if (!cancelled) {
          setAgentHealth({
            status: "ok",
            data: result.data,
            message: "Research agent is reachable."
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAgentHealth({
            status: "error",
            data: null,
            message: error instanceof Error ? error.message : "Research agent is unreachable."
          });
        }
      }
    }

    void checkAgent();

    return () => {
      cancelled = true;
    };
  }, []);

  const checks = [
    {
      label: "Owner wallet connected",
      ok: walletConnected,
      fix: "Connect the owner/admin wallet that controls the deployed contracts."
    },
    {
      label: "Correct network",
      ok: networkSupported,
      fix: "Switch the connected wallet to Arbitrum Sepolia."
    },
    {
      label: "Live contract config",
      ok: liveConfigReady,
      fix: "Finish the live contract, router, token, or wrapper env configuration."
    },
    {
      label: "Live setup verified",
      ok: topologyReady,
      fix: "Run the live setup step so the vault and execution guard confirm the current operator."
    },
    {
      label: "Private config ready",
      ok: noxClientConfigReady,
      fix: "Add the public Nox gateway, handle, and application contract configuration."
    },
    {
      label: "Research agent reachable",
      ok: agentHealth.status === "ok",
      fix:
        agentHealth.status === "checking"
          ? "Waiting for the FastAPI health check."
          : "Deploy FastAPI and set NEXT_PUBLIC_AGENT_BASE_URL to its public /health-capable base URL."
    },
    {
      label: "ChainGPT analyst active",
      ok: Boolean(agentHealth.data?.chain_gpt.configured),
      fix: "Set CHAINGPT_API_KEY on the deployed FastAPI agent so research explanations use ChainGPT."
    },
    {
      label: "Trading enabled",
      ok: !systemPaused,
      fix: "Resume the system before attempting another live action."
    }
  ];

  const failingChecks = checks.filter((check) => !check.ok);

  const passCount = checks.filter((c) => c.ok).length;
  const status: HealthStatus =
    passCount === checks.length ? "healthy" : passCount >= checks.length - 2 ? "degraded" : "critical";

  const statusConfig = {
    healthy: {
      bg: "border-emerald-400/15 bg-emerald-400/[0.04]",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      text: "Ready for the next guided action",
      tone: "success" as const
    },
    degraded: {
      bg: "border-amber-400/15 bg-amber-400/[0.04]",
      icon: <Radio className="h-5 w-5 text-amber-400" />,
      text: "Partially ready — a few setup items still need attention",
      tone: "warning" as const
    },
    critical: {
      bg: "border-rose-400/15 bg-rose-400/[0.04]",
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
      text: "Not ready yet — fix the blockers below before the live flow can continue",
      tone: "error" as const
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-[24px] border p-5 ${config.bg}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <p className="text-sm font-medium text-white">{config.text}</p>
              <p className="text-xs text-slate-400">
                {executionWallet.sessionActive
                  ? "A bounded session is currently active."
                  : executionWallet.status === "executed"
                    ? "The swap already executed and the run is waiting to be closed."
                    : "No live session is open right now."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Agent: {agentHealth.message}
                {agentHealth.data?.chain_gpt.configured
                  ? ` ChainGPT: ${agentHealth.data.chain_gpt.provider} (${agentHealth.data.chain_gpt.model ?? "default"}).`
                  : " ChainGPT: not configured."}
              </p>
            </div>
          </div>

          {failingChecks.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-white/8 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What to fix</p>
              <div className="space-y-2">
                {failingChecks.slice(0, 3).map((check) => (
                  <p key={check.label} className="text-sm leading-6 text-slate-300">
                    <span className="font-medium text-white">{check.label}:</span> {check.fix}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
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
    </div>
  );
}
