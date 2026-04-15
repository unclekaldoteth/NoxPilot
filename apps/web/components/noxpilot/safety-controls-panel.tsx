"use client";

import { Loader2, PauseCircle, ShieldAlert, ShieldBan } from "lucide-react";
import { SurfaceCard } from "@noxpilot/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNoxPilot } from "@/components/providers/app-state-provider";

export function SafetyControlsPanel() {
  const { systemPaused, togglePause, revokeSession, isPausing, isSettling, executionWallet } = useNoxPilot();

  function handleRevokeSession() {
    const confirmed = window.confirm(
      "Revoke the active execution session and settle assets back to the vault?"
    );
    if (!confirmed) {
      return;
    }

    void revokeSession();
  }

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/10">
            <ShieldAlert className="h-5 w-5 text-rose-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Safety Controls</h3>
            <p className="text-sm leading-6 text-slate-300">
              Pause the system or revoke a session — the vault is never exposed to uncapped execution authority.
            </p>
          </div>
        </div>
        <Badge variant={systemPaused ? "danger" : "warning"}>{systemPaused ? "Paused" : "Revocable"}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Button variant={systemPaused ? "default" : "secondary"} onClick={() => void togglePause()} disabled={isPausing}>
          {isPausing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {systemPaused ? "Resuming…" : "Pausing…"}
            </>
          ) : (
            <>
              <PauseCircle className="mr-2 h-4 w-4" />
              {systemPaused ? "Resume System" : "Pause System"}
            </>
          )}
        </Button>
        <Button variant="destructive" onClick={handleRevokeSession} disabled={isSettling || !executionWallet.sessionActive}>
          {isSettling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Revoking…
            </>
          ) : (
            <>
              <ShieldBan className="mr-2 h-4 w-4" />
              Revoke Execution Session
            </>
          )}
        </Button>
      </div>

      <div className="glass-outline rounded-3xl p-4 text-sm text-slate-300">
        These controls hit the live contract path. Pause toggles <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-cyan-200">PolicyVault.setPaused</code>, and revoke closes the active session through the settlement path.
      </div>
    </SurfaceCard>
  );
}
