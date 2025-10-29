// import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig = {
    env: {
        NEXT_PUBLIC_API_URL: apiUrl,
    },
    transpilePackages: ["@maine/libs", "next"],
    images: {
        remotePatterns: [
            {
                protocol: new URL(apiUrl).protocol.replace(':', ''),
                hostname: new URL(apiUrl).hostname,
                port: new URL(apiUrl).port,
                pathname: "/api/**",
            },
        ],
        unoptimized: false,
        formats: ["image/webp"],
    },
};

export default nextConfig;
