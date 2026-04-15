"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Shield, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { WalletConnectButton } from "./wallet-connect-button";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/demo", label: "Demo" },
  { href: "/trust", label: "Trust" }
];

export function SiteHeader() {
  const { mode, setMode, liveConfigReady, lastError } = useNoxPilot();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/70 backdrop-blur-xl">
      <div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Shield className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-cyan-200/80">NOXPILOT</p>
              <p className="text-xs text-slate-400">Bounded confidential execution</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={mode === "live" ? "success" : "warning"}>{mode === "live" ? "Live-ready" : "Mock-safe"}</Badge>
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

          {/* Mock/Live toggle — visible for judges */}
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

          {!liveConfigReady ? (
            <Badge variant="muted" className="hidden lg:inline-flex">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Live config incomplete
            </Badge>
          ) : null}

          {/* Error indicator */}
          {lastError ? (
            <span
              aria-label={`Latest error: ${lastError}`}
              className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]"
              title={lastError}
            />
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

            <div className="flex items-center gap-2 border-t border-white/5 pt-3">
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
              <WalletConnectButton />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
