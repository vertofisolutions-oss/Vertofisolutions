import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vertofi/ui"],
  poweredByHeader: false,
};

export default config;
