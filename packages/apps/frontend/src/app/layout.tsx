import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavigationRefreshProvider, ThemeProvider } from "@maine/libs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Maine",
	description: "動画ファイルをストリーミング再生できる動画プレイヤー",
	keywords: [
		"video",
		"video",
		"streaming",
		"self-hosted",
		"動画",
		"ビデオ",
		"ストリーミング",
	],
	authors: [{ name: "Akaaku" }],
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
								const w = typeof window !== "undefined" ? window : undefined;
								const ls = w && w.localStorage;
								const theme =
									ls && typeof ls.getItem === "function"
										? (ls.getItem("theme") || "dark")
										: "dark";

								if (
									theme === "dark" ||
									(theme === "system" &&
										w &&
										w.matchMedia &&
										w.matchMedia("(prefers-color-scheme: dark)").matches)
								) {
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
