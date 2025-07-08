import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CATA_RT_URL: process.env.CATA_RT_URL,
  },
};

export default nextConfig;
