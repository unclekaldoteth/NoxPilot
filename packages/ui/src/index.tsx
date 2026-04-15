import type { PropsWithChildren, ReactNode } from "react";

function cx(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function SurfaceCard({
  className,
  children
}: PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(10,14,24,0.94))] p-6 shadow-[0_20px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function MetricPill({
  label,
  value,
  accent = "cyan"
}: {
  label: string;
  value: string;
  accent?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : accent === "amber"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : accent === "rose"
          ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";

  return (
    <div className={cx("inline-flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs", accentClass)}>
      <span className="uppercase tracking-[0.18em] text-white/55">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

export function DotStatus({
  tone,
  children
}: PropsWithChildren<{
  tone: "success" | "warning" | "error" | "info";
}>) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-400"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "error"
          ? "bg-rose-400"
          : "bg-cyan-400";

  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-200">
      <span className={cx("h-2.5 w-2.5 rounded-full shadow-[0_0_16px_currentColor]", toneClass)} />
      {children}
    </span>
  );
}

/* ─── New Primitives ───────────────────────── */

export function ProgressRing({
  value,
  max = 100,
  size = 56,
  stroke = 5,
  label,
  accent = "cyan"
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  accent?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  const accentColor =
    accent === "emerald"
      ? "stroke-emerald-400"
      : accent === "amber"
        ? "stroke-amber-400"
        : accent === "rose"
          ? "stroke-rose-400"
          : "stroke-cyan-400";

  return (
    <div className="relative inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={accentColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
        {Math.round(value)}
      </span>
      {label ? <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</span> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-xl", className)} />;
}

export function Tooltip({
  text,
  children
}: PropsWithChildren<{
  text: string;
}>) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex appearance-none cursor-help bg-transparent p-0 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {text}
        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-slate-900" />
      </span>
    </span>
  );
}

export function CheckItem({
  passed,
  children
}: PropsWithChildren<{
  passed: boolean;
}>) {
  return (
    <div className={cx(
      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
      passed
        ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-100"
        : "border-rose-400/20 bg-rose-400/5 text-rose-200"
    )}>
      <span className={cx(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        passed ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"
      )}>
        {passed ? "✓" : "✗"}
      </span>
      <span>{children}</span>
    </div>
  );
}

export function StepIndicator({
  step,
  total,
  labels
}: {
  step: number;
  total: number;
  labels?: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={cx(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
            i < step
              ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30"
              : i === step
                ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40 animate-pulse-glow"
                : "bg-white/5 text-slate-500 ring-1 ring-white/10"
          )}>
            {i < step ? "✓" : i + 1}
          </div>
          {i < total - 1 ? (
            <div className={cx(
              "h-0.5 w-4 rounded-full transition-colors",
              i < step ? "bg-emerald-400/40" : "bg-white/10"
            )} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StatusBanner({
  status,
  children
}: PropsWithChildren<{
  status: "success" | "warning" | "error" | "info";
}>) {
  const variants = {
    success: "border-emerald-400/20 bg-emerald-400/5 text-emerald-100",
    warning: "border-amber-400/20 bg-amber-400/5 text-amber-100",
    error: "border-rose-400/20 bg-rose-400/5 text-rose-100",
    info: "border-cyan-400/20 bg-cyan-400/5 text-cyan-100"
  };

  return (
    <div className={cx(
      "flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm",
      variants[status]
    )}>
      <DotStatus tone={status}>{""}</DotStatus>
      <span>{children}</span>
    </div>
  );
}
