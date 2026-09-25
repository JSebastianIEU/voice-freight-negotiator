import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image (deploy/web.Dockerfile):
  // .next/standalone carries only the files the server actually imports.
  output: "standalone",
};

export default nextConfig;
