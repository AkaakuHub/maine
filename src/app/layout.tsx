import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import UpdateIndicator from "@/components/UpdateIndicator";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "My Video Storage - オフライン対応動画プレイヤー",
	description:
		"ローカルに保存された動画ファイルをストリーミング再生・オフライン視聴できるPWA対応動画プレイヤー",
	keywords: [
		"video",
		"video",
		"streaming",
		"self-hosted",
		"PWA",
		"offline",
		"動画",
		"ビデオ",
		"ストリーミング",
		"オフライン",
	],
	authors: [{ name: "Akaaku" }],
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "My Video Storage",
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
			<body className={`${inter.className} antialiased`}>
				<ServiceWorkerRegistration />
				{children}
				<UpdateIndicator />
			</body>
		</html>
	);
}
