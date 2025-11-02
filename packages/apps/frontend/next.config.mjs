// import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig = {
	env: {
		NEXT_PUBLIC_API_URL: apiUrl,
	},
	transpilePackages: ["next"],
	// Cloudflare Workers 向けの最適化
	output: "standalone",
	// Workers でのパフォーマンス向上のため
	serverExternalPackages: ["@maine/libs"],
};

export default nextConfig;
