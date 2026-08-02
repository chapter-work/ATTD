import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},   // Turbopack 명시적 활성화 (next-pwa 충돌 방지)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
