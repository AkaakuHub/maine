import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "3000",
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
