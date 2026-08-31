import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@musclemap/react",
    "@musclemap/core",
    "@musclemap/assets",
  ],
};

export default nextConfig;
