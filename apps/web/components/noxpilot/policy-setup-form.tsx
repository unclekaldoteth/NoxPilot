"use client";

import { useEffect, useState, useTransition } from "react";
import { HelpCircle, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { DEFAULT_ALLOWED_TOKENS, PrivatePolicyInputSchema, type PrivatePolicyInput } from "@noxpilot/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SurfaceCard, Tooltip } from "@noxpilot/ui";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { buildDefaultPolicyInput } from "@/lib/contracts";
import { getConfiguredDemoTokens } from "@/lib/dex";

const BPS_PER_PERCENT = 100;
const MIN_SLIPPAGE_PERCENT = 0.05;
const MAX_SLIPPAGE_PERCENT = 5;

type PolicySetupFormValues = Omit<PrivatePolicyInput, "maxSlippageBps"> & {
  maxSlippagePct: number;
};

function FieldLabel({ htmlFor, label, tooltip }: { htmlFor: string; label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip text={tooltip}>
        <HelpCircle className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
      </Tooltip>
    </div>
  );
}

function toFormValues(nextPolicy: PrivatePolicyInput): PolicySetupFormValues {
  return {
    ...nextPolicy,
    maxSlippagePct: nextPolicy.maxSlippageBps / BPS_PER_PERCENT
  };
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function PolicySetupForm() {
  const {
    policy,
    savePolicy,
    mode,
    noxClientConfigReady,
    walletConnected,
    networkSupported,
    isPolicySaving,
    policySaveMessage
  } = useNoxPilot();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PolicySetupFormValues>({
    defaultValues: toFormValues(policy ?? buildDefaultPolicyInput())
  });

  useEffect(() => {
    form.reset(toFormValues(policy ?? buildDefaultPolicyInput()));
  }, [form, policy]);

  const selectedTokens = form.watch("allowedTokens");
  const availableTokens = mode === "live" ? getConfiguredDemoTokens().map((token) => token.symbol) : DEFAULT_ALLOWED_TOKENS;
  const fieldCount = 8;
  const filledFields = [
    form.watch("dailyBudgetUsd") > 0,
    form.watch("minConfidenceScore") > 0,
    form.watch("maxSlippagePct") > 0,
    selectedTokens.length > 0,
    form.watch("allowedProtocol")?.length > 0,
    form.watch("sessionExpiryHours") > 0,
    true, // oneTradePerDay always has value
    true  // autoExecuteEnabled always has value
  ].filter(Boolean).length;
  const completionPct = Math.round((filledFields / fieldCount) * 100);

  function toggleToken(symbol: string) {
    const current = form.getValues("allowedTokens");
    form.setValue(
      "allowedTokens",
      current.includes(symbol) ? current.filter((token) => token !== symbol) : [...current, symbol],
      { shouldValidate: true }
    );
  }

  function onSubmit(values: PolicySetupFormValues) {
    startTransition(async () => {
      try {
        setError(null);
        const parsedPolicy = PrivatePolicyInputSchema.parse({
          ...values,
          maxSlippageBps: Math.round(values.maxSlippagePct * BPS_PER_PERCENT)
        });
        await savePolicy(parsedPolicy);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Policy encryption failed.");
      }
    });
  }

  const loading = isPending || isPolicySaving;

  return (
    <SurfaceCard className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
            <LockKeyhole className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Policy Setup</h3>
            <p className="text-sm leading-6 text-slate-300">Define your execution limits. Sensitive values are encrypted before saving on-chain.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={mode === "mock" ? "warning" : "muted"}>{mode === "mock" ? "Dev mock path" : "Live Nox path"}</Badge>
          <span className="text-xs text-slate-500">{completionPct}% filled</span>
        </div>
      </div>

      {/* Completion bar */}
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-cyan-400/60 transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Section: Budget & Limits */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/60">💰 Budget & Limits</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel htmlFor="dailyBudgetUsd" label="Daily budget (USD)" tooltip="Max USD the agent can spend per session. Gets encrypted via Nox handle." />
              <Input
                id="dailyBudgetUsd"
                type="number"
                inputMode="decimal"
                autoComplete="off"
                placeholder="1500…"
                {...form.register("dailyBudgetUsd", { valueAsNumber: true })}
              />
              {form.formState.errors.dailyBudgetUsd ? (
                <p className="text-xs text-rose-300">{form.formState.errors.dailyBudgetUsd.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="sessionExpiryHours" label="Session expiry (hours)" tooltip="How long a bounded session stays open before expiring automatically." />
              <Input
                id="sessionExpiryHours"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="12…"
                {...form.register("sessionExpiryHours", { valueAsNumber: true })}
              />
              {form.formState.errors.sessionExpiryHours ? (
                <p className="text-xs text-rose-300">{form.formState.errors.sessionExpiryHours.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="allowedProtocol" label="Allowed protocol" tooltip="The execution protocol label. Only this protocol's guard path is allowed." />
              <Input id="allowedProtocol" autoComplete="off" placeholder="NoxPilot ExecutionGuard Session…" {...form.register("allowedProtocol")} />
              {form.formState.errors.allowedProtocol ? (
                <p className="text-xs text-rose-300">{form.formState.errors.allowedProtocol.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Section: Risk Controls */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/60">🛡️ Risk Controls</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="minConfidenceScore" label="Min confidence score" tooltip="Agent recommendation must reach this score to proceed. Encrypted and verified on-chain." />
              <Input
                id="minConfidenceScore"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="78…"
                {...form.register("minConfidenceScore", { valueAsNumber: true })}
              />
              {form.formState.errors.minConfidenceScore ? (
                <p className="text-xs text-rose-300">{form.formState.errors.minConfidenceScore.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="maxSlippagePct" label="Max slippage (%)" tooltip="Maximum allowed slippage as a percentage. Internally this is converted to basis points for the contract path." />
              <Input
                id="maxSlippagePct"
                type="number"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.45…"
                step="0.01"
                {...form.register("maxSlippagePct", {
                  valueAsNumber: true,
                  min: {
                    value: MIN_SLIPPAGE_PERCENT,
                    message: `Max slippage must be at least ${formatPercent(MIN_SLIPPAGE_PERCENT)}%.`
                  },
                  max: {
                    value: MAX_SLIPPAGE_PERCENT,
                    message: `Max slippage must be at most ${formatPercent(MAX_SLIPPAGE_PERCENT)}%.`
                  }
                })}
              />
              {form.formState.errors.maxSlippagePct ? (
                <p className="text-xs text-rose-300">{form.formState.errors.maxSlippagePct.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Section: Token Whitelist */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/60">🪙 Allowed Tokens</p>
          <div className="flex flex-wrap gap-2">
            {availableTokens.map((token) => {
              const active = selectedTokens.includes(token);
              return (
                <button
                  key={token}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleToken(token)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                    active
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-glow-cyan"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                  )}
                >
                  {token}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Execution Preferences */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/60">⚡ Execution Preferences</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-outline flex items-center justify-between rounded-3xl p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">One trade per day</p>
                <p className="text-xs text-slate-400">Limits each session to a single trade execution.</p>
              </div>
              <Switch checked={form.watch("oneTradePerDay")} onCheckedChange={(checked) => form.setValue("oneTradePerDay", checked)} />
            </div>
            <div className="glass-outline flex items-center justify-between rounded-3xl p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Auto execute</p>
                <p className="text-xs text-slate-400">Still bounded by all policy and session checks.</p>
              </div>
              <Switch checked={form.watch("autoExecuteEnabled")} onCheckedChange={(checked) => form.setValue("autoExecuteEnabled", checked)} />
            </div>
          </div>
        </div>

        {/* Policy preview */}
        <div className="glass-outline rounded-3xl p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 mb-2">What this policy means</p>
          <p className="text-sm leading-6 text-slate-300">
            The agent can spend up to <span className="text-white font-medium">${form.watch("dailyBudgetUsd")}</span> per session
            on tokens <span className="text-cyan-200">[{selectedTokens.join(", ")}]</span>,
            only if confidence ≥ <span className="text-white font-medium">{form.watch("minConfidenceScore")}</span>,
            with max <span className="text-white font-medium">{formatPercent(form.watch("maxSlippagePct"))}%</span> slippage.
            Session expires after <span className="text-white font-medium">{form.watch("sessionExpiryHours")}h</span>.
          </p>
        </div>

        {mode === "live" && (!walletConnected || !networkSupported || !noxClientConfigReady) ? (
          <div aria-live="polite" className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Live policy save requires a connected wallet on Arbitrum Sepolia plus public Nox application-contract config.
          </div>
        ) : null}

        {error ? <p aria-live="polite" className="text-sm text-rose-300">{error}</p> : null}
        {loading && policySaveMessage ? (
          <p aria-live="polite" className="text-sm text-cyan-200">{policySaveMessage}</p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? (policySaveMessage ?? "Encrypting & Writing On-Chain...") : "Encrypt & Save Policy On-Chain"}
        </Button>
      </form>
    </SurfaceCard>
  );
}
