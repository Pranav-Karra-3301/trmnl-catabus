import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CATA_RT_BASE: process.env.CATA_RT_BASE,
    CATA_RT_TYPE: process.env.CATA_RT_TYPE,
  },
};

export default nextConfig;
