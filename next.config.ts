import type { NextConfig } from "next";

const repo = "mia-app";
const isProd = process.env.NODE_ENV === "production";
const isGhPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isProd && isGhPages ? `/${repo}` : "",
  assetPrefix: isProd && isGhPages ? `/${repo}/` : "",
};

export default nextConfig;
