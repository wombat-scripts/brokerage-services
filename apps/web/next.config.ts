import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@wombat/contracts"],
  outputFileTracingRoot: path.join(appDir, "../.."),
  // Contracts use Node ESM specifiers (`./firm.js` → firm.ts). Do not rewrite
  // Andre's package. Teach the bundler the same extension alias TypeScript uses.
  experimental: {
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  turbopack: {
    root: path.join(appDir, "../.."),
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
