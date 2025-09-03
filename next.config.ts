// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Ship even if ESLint has errors
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Ship even if TypeScript has type errors
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

