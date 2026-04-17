import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProviders } from "@/components/providers/root-providers";
import { SiteHeader } from "@/components/noxpilot/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoxPilot",
  description: "Confidential bounded crypto execution with isolated capital and revocable AI authority.",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RootProviders>
          <SiteHeader />
          <main>{children}</main>
          <footer className="border-t border-white/8 py-8">
            <div className="container flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>NoxPilot is a hackathon MVP for bounded confidential execution.</p>
              <p className="font-[family-name:var(--font-mono)]">Vault wallet • Execution wallet • Confidential policy • Revocable controls</p>
            </div>
          </footer>
        </RootProviders>
      </body>
    </html>
  );
}
