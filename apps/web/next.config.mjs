import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../..");

export default function nextConfig(phase) {
  return {
    // Keep dev output separate from production builds so `next build` does not
    // corrupt a running `next dev` server's chunk graph.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    outputFileTracingRoot: workspaceRoot,
    transpilePackages: ["@noxpilot/shared", "@noxpilot/nox-sdk", "@noxpilot/ui"],
    webpack: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@noxpilot/nox-sdk": path.resolve(workspaceRoot, "packages/nox-sdk/src/index.ts"),
        "@react-native-async-storage/async-storage": false,
        "pino-pretty": false
      };
      config.resolve.extensionAlias = {
        ...(config.resolve.extensionAlias ?? {}),
        ".js": [".ts", ".tsx", ".js"],
        ".mjs": [".mts", ".mjs"]
      };

      return config;
    }
  };
}
