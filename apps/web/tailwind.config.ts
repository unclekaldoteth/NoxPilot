import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1320px"
      }
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        halo: "0 28px 90px rgba(0, 0, 0, 0.45)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.06)",
        "glow-cyan": "0 0 40px -8px rgba(34, 211, 238, 0.2)",
        "glow-emerald": "0 0 40px -8px rgba(16, 185, 129, 0.2)",
        "glow-violet": "0 0 40px -8px rgba(167, 139, 250, 0.2)",
        "glow-amber": "0 0 40px -8px rgba(251, 191, 36, 0.2)"
      },
      backgroundImage: {
        "mesh-glow":
          "radial-gradient(circle at top right, rgba(22,163,74,0.18), transparent 35%), radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 28%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))"
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.5s ease-out both",
        "fade-slide-in": "fadeSlideIn 0.35s ease-out both"
      }
    }
  },
  plugins: [animate]
};

export default config;
