import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "My Video Storage - セルフホストアニメプレイヤー",
	description:
		"ローカルに保存された動画ファイルをストリーミング再生できるセルフホストアニメプレイヤー",
	keywords: [
		"video",
		"video",
		"streaming",
		"self-hosted",
		"アニメ",
		"動画",
		"ストリーミング",
	],
	authors: [{ name: "Akaaku" }],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" className="dark">
			<body className={`${inter.className} antialiased`}>{children}</body>
		</html>
	);
}
