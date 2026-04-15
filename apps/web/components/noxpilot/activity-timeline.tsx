"use client";

import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { DotStatus, SurfaceCard } from "@noxpilot/ui";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/utils";

const ACTOR_COLORS: Record<string, string> = {
  operator: "text-blue-300",
  "research-agent": "text-violet-300",
  "execution-layer": "text-emerald-300",
  system: "text-slate-400"
};

const ACTOR_LABELS: Record<string, string> = {
  operator: "Operator",
  "research-agent": "Research Agent",
  "execution-layer": "Execution Layer",
  system: "System"
};

export function ActivityTimeline() {
  const { activity } = useNoxPilot();
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? activity.length : 5;
  const visible = activity.slice(0, visibleCount);
  const hasMore = activity.length > 5;

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Activity Timeline</h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">Real wallet actions, agent responses, and state transitions.</p>
        </div>
        {activity.length > 0 ? (
          <span className="flex h-6 items-center rounded-full bg-cyan-400/10 px-2.5 text-xs font-medium text-cyan-200">
            {activity.length}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {activity.length === 0 ? (
          <div className="glass-outline rounded-3xl p-4 text-sm text-slate-400">
            No activity yet. Connect wallet and proceed through the flow to see real events here.
          </div>
        ) : null}
        {visible.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              "glass-outline rounded-2xl p-4 transition-all",
              idx === 0 && "ring-1 ring-cyan-400/10"
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <DotStatus tone={item.status}>{item.title}</DotStatus>
                {idx === 0 ? (
                  <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-cyan-300">
                    Latest
                  </span>
                ) : null}
              </div>
              <span className={cn("text-xs font-medium uppercase tracking-[0.12em]", ACTOR_COLORS[item.actor] ?? "text-slate-500")}>
                {ACTOR_LABELS[item.actor] ?? item.actor}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/5 py-2.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show less" : `Show all ${activity.length} events`}
        </button>
      ) : null}
    </SurfaceCard>
  );
}
