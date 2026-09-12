import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@musclemap/react",
    "@musclemap/core",
    "@musclemap/assets",
  ],
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
