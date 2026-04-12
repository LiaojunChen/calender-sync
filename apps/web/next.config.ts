import type { NextConfig } from "next";

const basePath = process.env.PAGES_BASE_PATH?.trim() || undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  basePath,
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@project-calendar/shared"],
};

export default nextConfig;
