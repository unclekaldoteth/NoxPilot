"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CircleAlert, Menu, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { WalletConnectButton } from "./wallet-connect-button";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/demo", label: "Guided Demo" }
];

export function SiteHeader() {
  const { mode, setMode, devMocksEnabled, liveConfigReady, lastError } = useNoxPilot();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/70 backdrop-blur-xl">
      <div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/18 bg-[radial-gradient(circle_at_35%_25%,rgba(34,211,238,0.22),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(9,14,25,0.92))] shadow-[0_10px_28px_rgba(6,182,212,0.12)] transition group-hover:border-cyan-300/28">
              <div className="absolute inset-[3px] rounded-full border border-white/6 bg-slate-950/90" />
              <div className="relative flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full">
                <Image
                  src="/brand/logo-symbol-transparent.png"
                  alt=""
                  aria-hidden="true"
                  width={180}
                  height={180}
                  className="h-10 w-10 max-w-none translate-y-px object-contain"
                  sizes="40px"
                  priority
                  unoptimized
                />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-cyan-200/80 transition group-hover:text-cyan-100">NOXPILOT</p>
              <p className="truncate text-xs text-slate-400">Bounded confidential execution</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={mode === "live" ? "success" : "warning"}>
              {mode === "live" ? "Live flow" : "Mock flow"}
            </Badge>
            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 md:hidden"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-white/10 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {devMocksEnabled ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
              <span className="px-2 text-xs uppercase tracking-[0.18em] text-slate-500">Environment</span>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 p-1">
                {(["mock", "live"] as const).map((option) => (
                  <Button
                    key={option}
                    variant={mode === option ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode(option)}
                    className={cn(mode !== option && "text-slate-300")}
                  >
                    {option === "mock" ? "Mock" : "Live"}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Badge variant="muted" className="hidden lg:inline-flex">
              Live judged flow
            </Badge>
          )}

          {!liveConfigReady ? (
            <Badge variant="muted" className="hidden lg:inline-flex">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Setup needs attention
            </Badge>
          ) : null}

          <Link
            href="/trust"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Trust model
          </Link>

          {lastError ? (
            <span
              aria-label={`Latest error: ${lastError}`}
              className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-200"
              title={lastError}
            >
              <CircleAlert className="h-3.5 w-3.5" />
              Latest issue
            </span>
          ) : null}

          <WalletConnectButton />
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileNavOpen ? (
        <div id="mobile-navigation" className="border-t border-white/5 bg-slate-950/95 backdrop-blur-xl md:hidden">
          <div className="container space-y-3 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm transition",
                      isActive
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-white/5 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {devMocksEnabled ? (
                  <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
                    {(["mock", "live"] as const).map((option) => (
                      <Button
                        key={option}
                        variant={mode === option ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setMode(option)}
                        className={cn(mode !== option && "text-slate-300")}
                      >
                        {option === "mock" ? "Mock" : "Live"}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Badge variant="muted">Live judged flow</Badge>
                )}
                <Link href="/trust" className="px-1 text-sm text-slate-400 transition hover:text-white">
                  Trust model
                </Link>
              </div>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
