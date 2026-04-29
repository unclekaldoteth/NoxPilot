"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, Loader2, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";
import { MetricPill, SurfaceCard } from "@noxpilot/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNoxPilot } from "@/components/providers/app-state-provider";

function formatHandle(handle: string | null) {
  if (!handle) {
    return "n/a";
  }
  return `${handle.slice(0, 10)}…${handle.slice(-6)}`;
}

function formatAddress(address: string | null) {
  if (!address) {
    return "n/a";
  }
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

function explorerTxUrl(txHash: string | null) {
  return txHash ? `https://sepolia.arbiscan.io/tx/${txHash}` : null;
}

function explorerAddressUrl(address: string | null) {
  return address ? `https://sepolia.arbiscan.io/address/${address}` : null;
}

export function ConfidentialPositionCard({ interactive = false }: { interactive?: boolean }) {
  const {
    confidentialPosition,
    executionWallet,
    wrapAcquiredPosition,
    revealConfidentialBalance,
    unwrapConfidentialPosition,
    isWrapping,
    isRevealing,
    isUnwrapping
  } = useNoxPilot();

  const canWrap =
    interactive &&
    confidentialPosition?.status === "not_wrapped" &&
    executionWallet.status === "executed" &&
    !isWrapping;
  const canReveal =
    interactive &&
    Boolean(confidentialPosition?.encryptedBalanceHandle) &&
    confidentialPosition?.status !== "unwrapped" &&
    !isRevealing;
  const canUnwrap =
    interactive &&
    Boolean(confidentialPosition?.encryptedBalanceHandle) &&
    confidentialPosition?.status !== "unwrapped" &&
    !isUnwrapping;

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
            <LockKeyhole className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Confidential Position</h3>
            <p className="text-sm leading-6 text-slate-300">
              Converts the acquired ERC-20 into a confidential Nox asset, then exposes owner-only reveal and unwrap controls.
            </p>
          </div>
        </div>
        <MetricPill label="State" value={confidentialPosition?.status?.replaceAll("_", " ") ?? "idle"} accent="cyan" />
      </div>

      {!confidentialPosition ? (
        <div className="glass-outline space-y-3 rounded-3xl p-4 text-sm text-slate-400">
          <p>No confidential position yet. After the guarded swap executes, wrap the acquired ERC-20 to protect the balance with Nox.</p>
          {!interactive ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/demo#step-confidential">Protect position in demo</Link>
            </Button>
          ) : (
            <p className="text-slate-500">This step unlocks after the guarded swap completes.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{confidentialPosition.underlyingSymbol}</Badge>
            {confidentialPosition.wrapperAddress ? (
              <Badge variant="muted">Wrapper {formatAddress(confidentialPosition.wrapperAddress)}</Badge>
            ) : null}
            {confidentialPosition.publicAmount ? (
              <Badge variant="muted">Public amount {confidentialPosition.publicAmount}</Badge>
            ) : null}
            {confidentialPosition.viewerAclState?.canDecrypt ? (
              <Badge variant="success">Owner can reveal</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-outline rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Encrypted amount handle</p>
              <p className="mt-2 font-mono text-sm text-cyan-100">{formatHandle(confidentialPosition.encryptedAmountHandle)}</p>
            </div>
            <div className="glass-outline rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidential balance handle</p>
              <p className="mt-2 font-mono text-sm text-cyan-100">{formatHandle(confidentialPosition.encryptedBalanceHandle)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Confidential asset proof</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Wrapper contract</span>
                {explorerAddressUrl(confidentialPosition.wrapperAddress) ? (
                  <a
                    href={explorerAddressUrl(confidentialPosition.wrapperAddress) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-cyan-100 transition hover:text-cyan-50"
                  >
                    {formatAddress(confidentialPosition.wrapperAddress)}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="mt-1 block text-slate-500">missing wrapper config</span>
                )}
              </div>
              <div>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Wrap transaction</span>
                {explorerTxUrl(confidentialPosition.wrapTxHash) ? (
                  <a
                    href={explorerTxUrl(confidentialPosition.wrapTxHash) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-cyan-100 transition hover:text-cyan-50"
                  >
                    {formatHandle(confidentialPosition.wrapTxHash)}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="mt-1 block text-slate-500">not wrapped yet</span>
                )}
              </div>
              <div>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">ACL state</span>
                <span className="mt-1 block">
                  {confidentialPosition.viewerAclState
                    ? confidentialPosition.viewerAclState.canDecrypt
                      ? "owner reveal permitted"
                      : "owner reveal blocked"
                    : "unchecked until reveal"}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Privacy boundary</span>
                <span className="mt-1 block">
                  Swap and deposit are public; post-wrap balance handle and reveal authorization are confidential.
                </span>
              </div>
            </div>
          </div>

          {confidentialPosition.decryptedBalance ? (
            <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Revealed balance</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">{confidentialPosition.decryptedBalance}</p>
            </div>
          ) : null}

          {confidentialPosition.viewerAclState ? (
            <div className="glass-outline rounded-3xl p-4 text-sm text-slate-300">
              ACL: {confidentialPosition.viewerAclState.isPublic ? "public" : "restricted"} ·{" "}
              {confidentialPosition.viewerAclState.canDecrypt ? "connected owner can decrypt" : "connected owner cannot decrypt"}
            </div>
          ) : null}

          {confidentialPosition.revealError ? (
            <div className="rounded-3xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-sm text-amber-100">
              {confidentialPosition.revealError}
            </div>
          ) : null}

          {confidentialPosition.unwrapTxHash || confidentialPosition.finalizeUnwrapTxHash ? (
            <div className="glass-outline rounded-3xl p-4 text-sm text-slate-300">
              Unwrap tx:{" "}
              <span className="font-mono text-cyan-100">{formatHandle(confidentialPosition.unwrapTxHash)}</span>
              {confidentialPosition.finalizeUnwrapTxHash ? (
                <>
                  {" "}
                  · finalize:{" "}
                  <span className="font-mono text-cyan-100">
                    {formatHandle(confidentialPosition.finalizeUnwrapTxHash)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {interactive ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => void wrapAcquiredPosition()} disabled={!canWrap}>
            {isWrapping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wrapping On-Chain…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Wrap Acquired ERC-20
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => void revealConfidentialBalance()} disabled={!canReveal}>
            {isRevealing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revealing…
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Reveal Confidential Balance
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => void unwrapConfidentialPosition()} disabled={!canUnwrap}>
            {isUnwrapping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unwrapping…
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Unwrap Position
              </>
            )}
          </Button>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
