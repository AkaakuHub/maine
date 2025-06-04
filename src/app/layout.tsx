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
		apple: [
			{ url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
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
			<body className={`${inter.className} antialiased`}>
				<ServiceWorkerRegistration />
				{children}
			</body>
		</html>
	);
}
