import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add Turbopack config to avoid warning when webpack is customized
  turbopack: {
    // You can add rules/aliases here if needed later
  },
  // Externalize server-only packages for both Webpack and Turbopack
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
