import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостатній сервер для деплою в Docker (.next/standalone/server.js).
  output: "standalone",
};

export default nextConfig;
