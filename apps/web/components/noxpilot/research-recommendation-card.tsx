"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, ArrowDownRight, LineChart } from "lucide-react";
import { MetricPill, ProgressRing, SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchResearchExplanation, fetchResearchRanking } from "@/lib/research";
import { formatPct, formatUsd } from "@/lib/format";
import { getSessionAssetConfig } from "@/lib/dex";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function ResearchRecommendationCard({ interactive = false }: { interactive?: boolean }) {
  const {
    policy,
    research,
    recommendation,
    researchExplanation,
    researchRankSource,
    researchExplainSource,
    setResearchResult,
    setResearchExplanation
  } = useNoxPilot();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showShortlist, setShowShortlist] = useState(false);
  const threshold = policy?.minConfidenceScore ?? 70;
  const clearsThreshold =
    recommendation !== null &&
    recommendation.score >= threshold &&
    recommendation.confidence >= threshold;

  function handleTriggerResearch() {
    startTransition(async () => {
      try {
        setRequestError(null);
        const sessionAssetSymbol = (() => {
          try {
            return getSessionAssetConfig().symbol;
          } catch {
            return "USDC";
          }
        })();
        const researchWhitelist = (policy?.allowedTokens ?? ["ETH", "ARB", "USDC", "LINK"]).filter(
          (symbol) => symbol.toUpperCase() !== sessionAssetSymbol
        );

        if (researchWhitelist.length === 0) {
          throw new Error("The current policy only whitelists the session asset. Add at least one tradable output token.");
        }

        const ranking = await fetchResearchRanking(researchWhitelist, "neutral");
        setResearchResult(ranking.data, ranking.delivery.source);

        const explain = await fetchResearchExplanation(
          ranking.data.bestCandidate,
          policy?.minConfidenceScore,
          policy?.allowedProtocol
        );
        setResearchExplanation(explain.data, explain.delivery.source);
      } catch (requestError) {
        setRequestError(requestError instanceof Error ? requestError.message : "Unable to fetch live research.");
      }
    });
  }

  const priceUp = recommendation?.price_change_pct_24h !== undefined && recommendation.price_change_pct_24h >= 0;

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
            <LineChart className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Research Agent</h3>
            <p className="text-sm leading-6 text-slate-300">Python agent scores tokens from live market data, then hands the ranking to TypeScript for review.</p>
          </div>
        </div>
        {recommendation ? <MetricPill label="Top pick" value={recommendation.symbol} /> : null}
      </div>

      {!recommendation ? (
        <div className="glass-outline rounded-3xl p-4 text-sm text-slate-400">No research ranking yet. Trigger the agent to score the token whitelist.</div>
      ) : (
        <>
          {/* Source badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={researchRankSource === "mock" ? "warning" : "success"}>
              {researchRankSource === "mock" ? "Dev mock ranking" : "Live ranking"}
            </Badge>
            {researchExplainSource ? (
              <Badge variant={researchExplainSource === "mock" ? "warning" : "success"}>
                {researchExplainSource === "mock" ? "Dev mock explanation" : "Live explanation"}
              </Badge>
            ) : null}
            {recommendation.market_source ? <Badge variant="muted">{recommendation.market_source}</Badge> : null}
          </div>

          {/* Verdict sentence */}
          <div className="rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
            <p className="text-sm font-medium text-white">
              <span className="text-cyan-200">{recommendation.symbol}</span> looks{" "}
              {clearsThreshold ? (
                <span className="text-emerald-300">good</span>
              ) : (
                <span className="text-amber-300">below threshold</span>
              )}{" "}
              — score {recommendation.score.toFixed(0)}/100
              {policy?.minConfidenceScore
                ? clearsThreshold
                  ? ` and confidence ${recommendation.confidence.toFixed(0)}/100, both above your ${policy.minConfidenceScore} threshold`
                  : ` and confidence ${recommendation.confidence.toFixed(0)}/100, below your ${policy.minConfidenceScore} threshold`
                : ""}.
            </p>
          </div>

          {/* Visual metrics */}
          <div className="flex flex-wrap items-start gap-6">
            <ProgressRing value={recommendation.score} label="Score" accent={recommendation.score >= 75 ? "emerald" : "amber"} />
            <ProgressRing value={recommendation.confidence} label="Confidence" accent={recommendation.confidence >= 75 ? "cyan" : "amber"} />
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                {priceUp ? (
                  <ArrowUpRight className="h-6 w-6 text-emerald-300" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-rose-300" />
                )}
              </div>
              <span className={`text-sm font-semibold ${priceUp ? "text-emerald-200" : "text-rose-200"}`}>
                {recommendation.price_change_pct_24h !== undefined ? formatPct(recommendation.price_change_pct_24h) : "n/a"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">24h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <span className="text-xs font-semibold text-white">
                  {recommendation.volume_24h_usd !== undefined ? formatUsd(recommendation.volume_24h_usd) : "n/a"}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Volume</span>
            </div>
          </div>

          {/* Thesis & details */}
          <div className="space-y-3 glass-outline rounded-3xl p-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{recommendation.symbol}</Badge>
              <Badge variant="muted">Expected move {recommendation.expected_move_pct.toFixed(1)}%</Badge>
              {recommendation.market_price_usd !== undefined ? (
                <Badge variant="muted">{formatUsd(recommendation.market_price_usd)}</Badge>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-slate-200">{researchExplanation?.summary ?? recommendation.thesis}</p>
            <p className="text-sm leading-6 text-slate-400">{recommendation.risk_note}</p>
            {researchExplanation?.checks.length ? (
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                {researchExplanation.checks.map((check) => (
                  <p key={check} className="text-xs leading-5 text-slate-400">
                    • {check}
                  </p>
                ))}
              </div>
            ) : null}
            {researchExplanation?.operator_note ? (
              <p className="text-xs leading-5 text-slate-500 border-t border-white/5 pt-3">{researchExplanation.operator_note}</p>
            ) : null}
          </div>

          {/* Ranked shortlist — collapsible */}
          {research?.candidates.length ? (
            <div className="space-y-2">
              <button
                type="button"
                aria-expanded={showShortlist}
                onClick={() => setShowShortlist(!showShortlist)}
                className="text-xs uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              >
                {showShortlist ? "▾ Hide" : "▸ Show"} ranked shortlist ({research.candidates.length} tokens)
              </button>
              {showShortlist
                ? research.candidates.map((candidate, index) => (
                    <div key={`${candidate.symbol}-${index}`} className="glass-outline flex items-center justify-between rounded-3xl p-4 text-sm text-slate-300">
                      <span>
                        #{index + 1} {candidate.symbol}
                      </span>
                      <span>
                        score {candidate.score.toFixed(1)} / confidence {candidate.confidence.toFixed(1)}
                      </span>
                    </div>
                  ))
                : null}
            </div>
          ) : null}
        </>
      )}

      {requestError ? <p aria-live="polite" className="text-sm text-rose-300">{requestError}</p> : null}
      {interactive ? (
        <Button onClick={handleTriggerResearch} disabled={isPending}>
          {isPending ? "Running Live Research…" : "Trigger Live Research"}
        </Button>
      ) : null}
    </SurfaceCard>
  );
}
