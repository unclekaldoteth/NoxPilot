"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import {
  Check,
  Lock,
  Wallet,
  Settings2,
  LockKeyhole,
  LineChart,
  ShieldCheck,
  WalletCards,
  Zap,
  ArrowRightLeft,
  PauseCircle
} from "lucide-react";

type WizardStep = {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: ReactNode;
};

const WIZARD_STEPS: WizardStep[] = [
  {
    key: "connect",
    label: "Connect Wallet",
    shortLabel: "Connect",
    description: "Connect your wallet on Arbitrum Sepolia to begin.",
    icon: <Wallet className="h-4 w-4" />
  },
  {
    key: "topology",
    label: "Initialize Topology",
    shortLabel: "Init",
    description: "Verify contract ownership and wire the execution guard.",
    icon: <Settings2 className="h-4 w-4" />
  },
  {
    key: "policy",
    label: "Set Policy & Encrypt",
    shortLabel: "Policy",
    description: "Configure budget, thresholds, and encrypt via Nox handles.",
    icon: <LockKeyhole className="h-4 w-4" />
  },
  {
    key: "research",
    label: "Trigger Research",
    shortLabel: "Research",
    description: "FastAPI agent scores tokens from live market data.",
    icon: <LineChart className="h-4 w-4" />
  },
  {
    key: "decision",
    label: "Evaluate Decision",
    shortLabel: "Decide",
    description: "TypeScript execution layer checks policy constraints.",
    icon: <ShieldCheck className="h-4 w-4" />
  },
  {
    key: "fund",
    label: "Open Session & Fund",
    shortLabel: "Fund",
    description: "Open a bounded on-chain session and fund the guard.",
    icon: <WalletCards className="h-4 w-4" />
  },
  {
    key: "execute",
    label: "Execute Bounded Swap",
    shortLabel: "Execute",
    description: "Perform one real exact-input swap through the guard.",
    icon: <Zap className="h-4 w-4" />
  },
  {
    key: "settle",
    label: "Settle Session",
    shortLabel: "Settle",
    description: "Close the session and sweep assets back to vault.",
    icon: <ArrowRightLeft className="h-4 w-4" />
  },
  {
    key: "safety",
    label: "Pause / Revoke",
    shortLabel: "Safety",
    description: "Toggle system pause or revoke the execution session.",
    icon: <PauseCircle className="h-4 w-4" />
  }
];

function useCurrentStep() {
  const {
    walletConnected,
    topologyReady,
    encryptedPolicy,
    recommendation,
    decision,
    executionWallet,
    settlement,
    systemPaused,
    hasUsedSafetyControl
  } = useNoxPilot();

  const completed = [
    walletConnected,
    topologyReady,
    Boolean(encryptedPolicy),
    Boolean(recommendation),
    Boolean(decision),
    executionWallet.sessionActive || executionWallet.status === "executed" || executionWallet.status === "settled",
    executionWallet.status === "executed" || executionWallet.status === "settled",
    Boolean(settlement),
    systemPaused || hasUsedSafetyControl
  ];

  const completedCount = completed.filter(Boolean).length;
  // Current step = first non-completed step
  const currentStep = completed.findIndex((v) => !v);
  return {
    completed,
    completedCount,
    currentStep: currentStep === -1 ? WIZARD_STEPS.length : currentStep
  };
}

export function DemoWizard({ children }: { children: ReactNode[] }) {
  const { completed, completedCount, currentStep } = useCurrentStep();
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to the current active step
  useEffect(() => {
    const el = stepsRef.current[currentStep];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep]);

  const allDone = completedCount === WIZARD_STEPS.length;

  return (
    <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
      {/* ── Sidebar Progress (desktop) ── */}
      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-1">
          <div className="mb-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Demo flow</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.95))]"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / WIZARD_STEPS.length) * 100}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {completedCount}/{WIZARD_STEPS.length} steps completed
            </p>
          </div>

          {WIZARD_STEPS.map((step, idx) => {
            const done = completed[idx];
            const active = idx === currentStep;
            const locked = idx > currentStep;

            return (
              <button
                key={step.key}
                type="button"
                disabled={locked}
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  if (locked) {
                    return;
                  }
                  stepsRef.current[idx]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                  });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                  done
                    ? "text-emerald-200 hover:bg-emerald-400/5"
                    : active
                      ? "bg-cyan-400/10 text-cyan-100 ring-1 ring-cyan-400/20"
                      : locked
                        ? "cursor-not-allowed text-slate-500"
                        : "text-slate-400 hover:bg-white/5"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
                    done
                      ? "bg-emerald-400/20 text-emerald-300"
                      : active
                        ? "bg-cyan-400/20 text-cyan-200"
                        : "bg-white/5 text-slate-500"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : step.icon}
                </span>
                <span className="truncate">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="space-y-0">
        {/* ── Mobile Progress Bar ── */}
        <div className="mb-6 xl:hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Demo flow</p>
            <p className="text-xs text-slate-500">
              {completedCount}/{WIZARD_STEPS.length}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.95))]"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / WIZARD_STEPS.length) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((step, idx) => {
              const done = completed[idx];
              const active = idx === currentStep;
              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={idx > currentStep}
                  aria-current={active ? "step" : undefined}
                  onClick={() => {
                    if (idx > currentStep) {
                      return;
                    }
                    stepsRef.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                    done
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : active
                        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                        : idx > currentStep
                          ? "cursor-not-allowed border-white/10 text-slate-600"
                          : "border-white/10 text-slate-500"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <span>{idx + 1}</span>}
                  <span>{step.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step Cards ── */}
        {WIZARD_STEPS.map((step, idx) => {
          const done = completed[idx];
          const active = idx === currentStep;
          const locked = idx > currentStep;

          return (
            <div
              key={step.key}
              ref={(el) => {
                stepsRef.current[idx] = el;
              }}
              className="relative"
            >
              {/* Step connector line */}
              {idx < WIZARD_STEPS.length - 1 ? (
                <div className="absolute left-6 top-[72px] bottom-0 w-0.5 xl:left-6">
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-colors duration-500",
                      done ? "bg-emerald-400/30" : "bg-white/5"
                    )}
                  />
                </div>
              ) : null}

              {/* Step header */}
              <div className="relative flex items-start gap-4 pb-2">
                <div
                  className={cn(
                    "z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300",
                    done
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : active
                        ? "border-cyan-400/30 bg-cyan-400/10 animate-pulse-glow"
                        : "border-white/10 bg-white/5"
                  )}
                >
                  {done ? (
                    <Check className="h-5 w-5 text-emerald-300 animate-check-pop" />
                  ) : locked ? (
                    <Lock className="h-4 w-4 text-slate-500" />
                  ) : (
                    <span className={cn("text-sm", active ? "text-cyan-200" : "text-slate-400")}>
                      {step.icon}
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-3">
                    <h3
                      className={cn(
                        "text-lg font-semibold transition-colors",
                        done ? "text-emerald-200" : active ? "text-white" : "text-slate-500"
                      )}
                    >
                      <span className="mr-2 text-sm font-normal text-slate-500">{idx + 1}.</span>
                      {step.label}
                    </h3>
                    {done ? (
                      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                        Done
                      </span>
                    ) : active ? (
                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className={cn("text-sm", done || active ? "text-slate-300" : "text-slate-600")}>
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Step content */}
              <AnimatePresence>
                {(active || done) && children[idx] ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="ml-14 pb-8"
                  >
                    <div className={cn(
                      "rounded-[28px] border p-6 transition-all duration-300",
                      active
                        ? "border-cyan-400/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(10,14,24,0.94))] shadow-[0_20px_80px_rgba(2,6,23,0.55)] card-glow-cyan"
                        : "border-white/5 bg-white/[0.02]"
                    )}>
                      {children[idx]}
                    </div>
                  </motion.div>
                ) : locked ? (
                  <div className="ml-14 pb-8">
                    <div className="rounded-[28px] border border-white/5 bg-white/[0.01] p-5">
                      <p className="text-sm text-slate-600">
                        <Lock className="mr-2 inline h-3.5 w-3.5" />
                        Complete step {currentStep + 1} first
                      </p>
                    </div>
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}

        {/* ── Completion Celebration ── */}
        <AnimatePresence>
          {allDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(34,211,238,0.05))] p-8 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 ring-2 ring-emerald-400/25">
                <Check className="h-8 w-8 text-emerald-300" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Demo Complete</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">
                Every step in the NoxPilot bounded execution flow has been completed with real wallet actions, live agent
                responses, and on-chain state transitions.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
