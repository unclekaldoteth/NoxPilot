"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, ShieldCheck } from "lucide-react";
import type {
  TokenDiscoveryCandidate,
  TokenDiscoveryCategory,
  TokenDiscoveryChain,
  TokenDiscoveryResponse
} from "@noxpilot/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { fetchTokenDiscovery } from "@/lib/research";
import { getConfiguredDemoTokens } from "@/lib/dex";
import { getConfidentialWrapperSupport } from "@/lib/confidential-assets";
import { formatPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@noxpilot/ui";

const CATEGORIES: Array<{ value: TokenDiscoveryCategory; label: string }> = [
  { value: "meme", label: "Meme" },
  { value: "ai", label: "AI" },
  { value: "defi", label: "DeFi" },
  { value: "gaming", label: "Gaming" },
  { value: "rwa", label: "RWA" },
  { value: "trending", label: "Trending" }
];

const CHAINS: Array<{ value: TokenDiscoveryChain; label: string }> = [
  { value: "base", label: "Base" },
  { value: "bsc", label: "BNB" },
  { value: "solana", label: "Solana" }
];

function statusVariant(status: string) {
  return status === "executable" ? "success" : status === "needs_allowlist" ? "warning" : "muted";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function buildExecutableLaneResponse(category: TokenDiscoveryCategory): TokenDiscoveryResponse {
  const marketHints: Record<string, { priceChange: number; volume: number; liquidity: number; txns: number }> = {
    ETH: { priceChange: 1.4, volume: 8_500_000, liquidity: 3_200_000, txns: 1850 },
    ARB: { priceChange: 7.8, volume: 2_400_000, liquidity: 980_000, txns: 1260 },
    LINK: { priceChange: 4.1, volume: 3_100_000, liquidity: 1_250_000, txns: 1120 }
  };
  const candidates = getConfiguredDemoTokens()
    .filter((token) => token.symbol !== "USDC")
    .map((token): TokenDiscoveryCandidate => {
      const support = getConfidentialWrapperSupport(token.symbol);
      const hint = marketHints[token.symbol] ?? {
        priceChange: 2.5,
        volume: 1_000_000,
        liquidity: 500_000,
        txns: 800
      };

      return {
        symbol: token.symbol,
        name: `${token.symbol} executable lane`,
        chain_id: "421614",
        chain_label: "Arbitrum Sepolia",
        chain_type: "evm",
        token_address: token.address,
        pair_address: null,
        dex_id: "uniswap-v3",
        dex_url: null,
        category,
        price_usd: null,
        price_change_pct_24h: hint.priceChange,
        volume_24h_usd: hint.volume,
        liquidity_usd: hint.liquidity,
        market_cap_usd: null,
        fdv_usd: null,
        pair_created_at: null,
        quote_token_symbol: "USDC",
        txns_24h: hint.txns,
        execution_status: support.supported ? "executable" : "needs_allowlist",
        execution_note: support.supported
          ? "Executable now: token, route, ExecutionGuard allowlist, and confidential wrapper are configured on Arbitrum Sepolia."
          : support.reason ?? "Token needs complete route, allowlist, and wrapper config before execution.",
        risk_flags: support.supported ? [] : ["missing wrapper"]
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    source: "NoxPilot executable Arbitrum lane",
    category,
    chains: ["arbitrum-sepolia"],
    candidates
  };
}

export function TokenDiscoveryCard({ interactive = false }: { interactive?: boolean }) {
  const { tokenDiscovery, tokenDiscoverySource, setTokenDiscoveryResult } = useNoxPilot();
  const [category, setCategory] = useState<TokenDiscoveryCategory>("meme");
  const [chains, setChains] = useState<TokenDiscoveryChain[]>(["base", "bsc", "solana"]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleChain(chain: TokenDiscoveryChain) {
    setChains((current) => {
      if (current.includes(chain)) {
        return current.length === 1 ? current : current.filter((item) => item !== chain);
      }
      return [...current, chain];
    });
  }

  function handleDiscoverTokens() {
    startTransition(async () => {
      try {
        setError(null);
        const result = await fetchTokenDiscovery({
          category,
          chains,
          limit: 9,
          min_liquidity_usd: 10000,
          min_volume_24h_usd: 1000,
          risk_mode: "balanced"
        });
        setTokenDiscoveryResult(result.data, result.delivery.source);
      } catch (discoveryError) {
        setError(discoveryError instanceof Error ? discoveryError.message : "Token discovery failed.");
      }
    });
  }

  function handleUseExecutableLane() {
    setError(null);
    setTokenDiscoveryResult(buildExecutableLaneResponse(category), "agent");
  }

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10">
            <Search className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Discover Tokens</h3>
            <p className="text-sm leading-6 text-slate-300">
              Search category-based tokens across Base, BNB, and Solana, or use the executable Arbitrum lane for live swap-ready candidates.
            </p>
          </div>
        </div>
        {tokenDiscovery ? (
          <Badge variant={tokenDiscoverySource === "mock" ? "warning" : "success"}>
            {tokenDiscovery.candidates.length} candidates
          </Badge>
        ) : null}
      </div>

      {interactive ? (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40",
                    category === item.value
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Chains</p>
            <div className="flex flex-wrap gap-2">
              {CHAINS.map((item) => {
                const active = chains.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleChain(item.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40",
                      active
                        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleUseExecutableLane} variant="secondary">
              Use Executable Arbitrum Lane
            </Button>
            <Button type="button" onClick={handleDiscoverTokens} disabled={isPending || chains.length === 0}>
              {isPending ? "Discovering Tokens..." : "Discover Research-Only Tokens"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Arbitrum lane is the safe v1 execution path. Base, BNB, and Solana discovery expands research only until separate deployments and wrappers exist.
          </p>
        </div>
      ) : null}

      {tokenDiscovery ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={tokenDiscoverySource === "mock" ? "warning" : "success"}>
              {tokenDiscoverySource === "mock" ? "Dev mock discovery" : tokenDiscovery.source}
            </Badge>
            <Badge variant="muted">{tokenDiscovery.category}</Badge>
            <Badge variant="muted">{tokenDiscovery.chains.join(", ")}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {tokenDiscovery.candidates.map((candidate) => (
              <div key={`${candidate.chain_id}-${candidate.token_address}`} className="glass-outline rounded-3xl p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{candidate.symbol}</p>
                    <p className="line-clamp-1 text-xs text-slate-500">{candidate.name}</p>
                  </div>
                  <Badge variant={statusVariant(candidate.execution_status)}>{statusLabel(candidate.execution_status)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>{candidate.chain_label}</span>
                  <span>{candidate.price_change_pct_24h !== null && candidate.price_change_pct_24h !== undefined ? formatPct(candidate.price_change_pct_24h) : "n/a"}</span>
                  <span>Liq {candidate.liquidity_usd ? formatUsd(candidate.liquidity_usd) : "n/a"}</span>
                  <span>Vol {candidate.volume_24h_usd ? formatUsd(candidate.volume_24h_usd) : "n/a"}</span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  {candidate.execution_note}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-outline space-y-3 rounded-3xl p-4 text-sm text-slate-400">
          <p>No discovery run yet. Start with a category search across Base, BNB, and Solana to widen the research universe.</p>
          {!interactive ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/demo#step-discover">Discover tokens in demo</Link>
            </Button>
          ) : (
            <p className="text-slate-500">Pick a category and chain mix above, then launch discovery.</p>
          )}
        </div>
      )}

      {error ? <p aria-live="polite" className="text-sm text-rose-300">{error}</p> : null}
    </SurfaceCard>
  );
}
