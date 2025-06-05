import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "My Anime Storage - オフライン対応動画プレイヤー",
	description:
		"ローカルに保存された動画ファイルをストリーミング再生・オフライン視聴できるPWA対応動画プレイヤー",
	keywords: [
		"video",
		"anime",
		"streaming",
		"self-hosted",
		"PWA",
		"offline",
		"動画",
		"アニメ",
		"ストリーミング",
		"オフライン",
	],
	authors: [{ name: "Akaaku" }],
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "My Anime Storage",
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		shortcut: "/favicon.ico",
		icon: [
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
		],
		apple: [
			{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
		],
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: "#1e293b",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" className="dark">
			<head>
				<link rel="icon" type="image/x-icon" href="/favicon.ico" />
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				/>
				<link rel="manifest" href="/manifest.json" />
			</head>
			<body className={`${inter.className} antialiased`}>
				<ServiceWorkerRegistration />
				{children}
			</body>
		</html>
	);
}
