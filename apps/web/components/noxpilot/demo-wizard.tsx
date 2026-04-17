"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Eye,
  LineChart,
  Lock,
  LockKeyhole,
  Search,
  Settings2,
  ShieldCheck,
  Wallet,
  WalletCards,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import {
  getOperatorCompletionCount,
  getOperatorCurrentPhaseIndex,
  getOperatorCurrentStepIndex,
  getOperatorStepCompletion,
  OPERATOR_PHASES,
  OPERATOR_STEPS,
  type OperatorStepKey
} from "@/lib/operator-flow";

const STEP_ICONS: Record<OperatorStepKey, ReactNode> = {
  connect: <Wallet className="h-4 w-4" />,
  topology: <Settings2 className="h-4 w-4" />,
  policy: <LockKeyhole className="h-4 w-4" />,
  discover: <Search className="h-4 w-4" />,
  research: <LineChart className="h-4 w-4" />,
  decision: <ShieldCheck className="h-4 w-4" />,
  fund: <WalletCards className="h-4 w-4" />,
  execute: <Zap className="h-4 w-4" />,
  confidential: <Eye className="h-4 w-4" />,
  settle: <ArrowRightLeft className="h-4 w-4" />
};

function useOperatorFlowProgress() {
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

  const completed = getOperatorStepCompletion({
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

  const completedCount = getOperatorCompletionCount({
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

  const currentStep = getOperatorCurrentStepIndex({
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

  const currentPhase = getOperatorCurrentPhaseIndex({
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

  return {
    completed,
    completedCount,
    currentStep,
    currentPhase,
    allDone: completedCount === OPERATOR_STEPS.length
  };
}

export function DemoWizard({ children }: { children: ReactNode }) {
  const { completed, completedCount, currentStep, currentPhase, allDone } = useOperatorFlowProgress();
  const stepChildren = Children.toArray(children);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [showStepMap, setShowStepMap] = useState(false);

  useEffect(() => {
    const el = stepsRef.current[currentStep];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep]);

  const currentPhaseConfig = OPERATOR_PHASES[currentPhase] ?? OPERATOR_PHASES[OPERATOR_PHASES.length - 1];

  return (
    <div className="grid gap-8 xl:grid-cols-[300px_1fr]">
      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Guided demo</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{currentPhaseConfig.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{currentPhaseConfig.description}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.95))]"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / OPERATOR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {completedCount}/{OPERATOR_STEPS.length} core steps complete
            </p>
          </div>

          <div className="space-y-2">
            {OPERATOR_PHASES.map((phase, phaseIndex) => {
              const stepIndexes = phase.stepKeys.map((key) =>
                OPERATOR_STEPS.findIndex((step) => step.key === key)
              );
              const phaseComplete = stepIndexes.every((index) => completed[index]);
              const phaseActive = phaseIndex === currentPhase;
              const unlocked = phaseIndex <= currentPhase || allDone;

              return (
                <div
                  key={phase.key}
                  className={cn(
                    "rounded-[24px] border p-4 transition",
                    phaseActive
                      ? "border-cyan-400/20 bg-cyan-400/[0.05]"
                      : phaseComplete
                        ? "border-emerald-400/15 bg-emerald-400/[0.04]"
                        : "border-white/8 bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{phase.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{phase.description}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]",
                        phaseActive
                          ? "bg-cyan-400/10 text-cyan-200"
                          : phaseComplete
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "bg-white/5 text-slate-500"
                      )}
                    >
                      {phaseActive ? "Current" : phaseComplete ? "Done" : unlocked ? "Ready" : "Locked"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {phase.stepKeys.map((stepKey) => {
                      const stepIndex = OPERATOR_STEPS.findIndex((step) => step.key === stepKey);
                      const step = OPERATOR_STEPS[stepIndex];
                      const done = completed[stepIndex];
                      const active = stepIndex === currentStep;
                      return (
                        <span
                          key={stepKey}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs",
                            done
                              ? "border-emerald-400/20 text-emerald-200"
                              : active
                                ? "border-cyan-400/20 text-cyan-200"
                                : "border-white/10 text-slate-500"
                          )}
                        >
                          {step.shortLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 xl:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Guided demo</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{currentPhaseConfig.title}</h2>
            </div>
            <button
              type="button"
              aria-expanded={showStepMap}
              onClick={() => setShowStepMap((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.06]"
            >
              See all steps
              <ChevronDown className={cn("h-4 w-4 transition-transform", showStepMap && "rotate-180")} />
            </button>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.95))]"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / OPERATOR_STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {completedCount}/{OPERATOR_STEPS.length} core steps complete
          </p>

          <AnimatePresence initial={false}>
            {showStepMap ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                {OPERATOR_PHASES.map((phase, phaseIndex) => {
                  const stepIndexes = phase.stepKeys.map((key) =>
                    OPERATOR_STEPS.findIndex((step) => step.key === key)
                  );
                  const phaseComplete = stepIndexes.every((index) => completed[index]);
                  const phaseActive = phaseIndex === currentPhase;

                  return (
                    <div key={phase.key} className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{phase.title}</p>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {phaseActive ? "Current" : phaseComplete ? "Done" : "Locked"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {phase.stepKeys.map((stepKey) => {
                          const stepIndex = OPERATOR_STEPS.findIndex((step) => step.key === stepKey);
                          const step = OPERATOR_STEPS[stepIndex];
                          const done = completed[stepIndex];
                          const active = stepIndex === currentStep;

                          return (
                            <span
                              key={stepKey}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs",
                                done
                                  ? "border-emerald-400/20 text-emerald-200"
                                  : active
                                    ? "border-cyan-400/20 text-cyan-200"
                                    : "border-white/10 text-slate-500"
                              )}
                            >
                              {step.shortLabel}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {OPERATOR_PHASES.map((phase, phaseIndex) => {
          const stepIndexes = phase.stepKeys.map((key) =>
            OPERATOR_STEPS.findIndex((step) => step.key === key)
          );
          const phaseComplete = stepIndexes.every((index) => completed[index]);
          const phaseActive = phaseIndex === currentPhase;
          const phaseUnlocked = phaseIndex <= currentPhase || allDone;

          return (
            <section
              key={phase.key}
              className={cn(
                "rounded-[32px] border p-6 transition-all",
                phaseActive
                  ? "border-cyan-400/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(10,14,24,0.94))] shadow-[0_24px_80px_rgba(2,6,23,0.45)]"
                  : phaseComplete
                    ? "border-emerald-400/12 bg-emerald-400/[0.03]"
                    : "border-white/8 bg-white/[0.02]"
              )}
            >
              <div className="flex flex-col gap-3 border-b border-white/6 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Phase {phaseIndex + 1}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{phase.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{phase.description}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex self-start rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] md:self-auto",
                    phaseActive
                      ? "bg-cyan-400/10 text-cyan-200"
                      : phaseComplete
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-white/5 text-slate-500"
                  )}
                >
                  {phaseActive ? "Current phase" : phaseComplete ? "Complete" : phaseUnlocked ? "Ready" : "Locked"}
                </span>
              </div>

              {!phaseUnlocked ? (
                <div className="mt-5 rounded-[24px] border border-white/8 bg-slate-950/50 p-5 text-sm leading-6 text-slate-500">
                  Unlock this phase by finishing <span className="text-slate-300">{OPERATOR_PHASES[phaseIndex - 1]?.title}</span>.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {stepIndexes.map((stepIndex) => {
                    const step = OPERATOR_STEPS[stepIndex];
                    const done = completed[stepIndex];
                    const active = stepIndex === currentStep;
                    const locked = stepIndex > currentStep && !allDone;

                    return (
                      <div
                        key={step.key}
                        id={`step-${step.key}`}
                        ref={(el) => {
                          stepsRef.current[stepIndex] = el;
                        }}
                        className="scroll-mt-28 rounded-[28px] border border-white/8 bg-slate-950/45 p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                                done
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                  : active
                                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                                    : "border-white/10 bg-white/[0.03] text-slate-400"
                              )}
                            >
                              {done ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : STEP_ICONS[step.key]}
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]",
                                    done
                                      ? "bg-emerald-400/10 text-emerald-200"
                                      : active
                                        ? "bg-cyan-400/10 text-cyan-200"
                                        : "bg-white/5 text-slate-500"
                                  )}
                                >
                                  {done ? "Done" : active ? "Current" : locked ? "Locked" : "Ready"}
                                </span>
                              </div>
                              <p className={cn("text-sm leading-6", locked ? "text-slate-600" : "text-slate-300")}>
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {done && !active ? (
                          <div className="mt-4 rounded-[22px] border border-emerald-400/12 bg-emerald-400/[0.04] px-4 py-3 text-sm text-emerald-100/90">
                            {step.doneLabel}
                          </div>
                        ) : null}

                        {locked ? (
                          <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-500">
                            {step.lockedLabel}
                          </div>
                        ) : null}

                        <AnimatePresence initial={false}>
                          {active && stepChildren[stepIndex] ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mt-5 rounded-[24px] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,24,0.92))] p-5">
                                {stepChildren[stepIndex]}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
