import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavigationRefreshProvider } from "@/contexts/NavigationRefreshContext";
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
		<html lang="ja" suppressHydrationWarning>
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: `
							try {
								const theme = localStorage.getItem('theme') || 'dark';
								if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
									document.documentElement.classList.add('dark');
								} else {
									document.documentElement.classList.remove('dark');
								}
							} catch (_) {
								document.documentElement.classList.add('dark');
							}
						`,
					}}
				/>
			</head>
			<body className={`${inter.className} antialiased`}>
				<ThemeProvider>
					<NavigationRefreshProvider>{children}</NavigationRefreshProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
