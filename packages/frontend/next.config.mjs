import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@maine/shared-types",
    "@maine/shared-utils",
  ],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/**",
      },
    ],
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

// 一時的にnext-pwaを無効化してカスタムService Workerのみ使用
export default nextConfig;
