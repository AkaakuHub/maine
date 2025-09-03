"use client";

import { useState } from "react";
import {
	Activity,
	Database,
	HardDrive,
	Cpu,
	Wifi,
	RefreshCw,
} from "lucide-react";
import { ScanProgressBar } from "@/components/scan/ScanProgressBar";
import { ScanControlButtons } from "@/components/scan/ScanControlButtons";
import { useScanProgress } from "@/hooks/useScanProgress";
import { cn } from "@/libs/utils";

/**
 * スキャン管理ページ
 *
 * スキャンの詳細な状態表示と制御機能を提供
 */
export default function ScanManagementPage() {
	const scanProgress = useScanProgress();
	const [isStartingScan, setIsStartingScan] = useState(false);

	// スキャンを手動開始
	const handleStartScan = async () => {
		setIsStartingScan(true);
		try {
			const response = await fetch("/api/scan/start", {
				method: "POST",
			});

			if (!response.ok) {
				const error = await response.json();
				console.error("Failed to start scan:", error);
				// TODO: エラー通知を表示
			}
		} catch (error) {
			console.error("Scan start request failed:", error);
		} finally {
			setIsStartingScan(false);
		}
	};

	return (
		<div className="min-h-screen bg-background-secondary">
			{/* ヘッダー */}
			<div className="border-b border-border bg-surface">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center gap-3">
						<Activity className="h-8 w-8 text-primary" />
						<div>
							<h1 className="text-2xl font-bold text-text-primary">
								スキャン管理
							</h1>
							<p className="text-text-secondary">
								ビデオファイルスキャンの詳細な監視と制御
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* メインダッシュボード */}
					<div className="lg:col-span-2 space-y-6">
						{/* スキャン状態カード */}
						<div className="bg-surface rounded-lg border border-border p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
									<Database className="h-5 w-5" />
									スキャン状態
								</h2>

								{/* スキャン開始ボタン */}
								{!scanProgress.isScanning && !scanProgress.isPaused && (
									<button
										type="button"
										onClick={handleStartScan}
										disabled={isStartingScan}
										className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isStartingScan ? (
											<RefreshCw className="h-4 w-4 animate-spin" />
										) : (
											<Activity className="h-4 w-4" />
										)}
										スキャン開始
									</button>
								)}
							</div>

							{/* 進捗バー */}
							<ScanProgressBar showDetails={true} showControls={false} />

							{/* 制御ボタン */}
							{(scanProgress.isScanning || scanProgress.isPaused) && (
								<div className="mt-4 pt-4 border-t border-border">
									<div className="flex items-center justify-between">
										<span className="text-sm text-text-secondary">制御</span>
										<ScanControlButtons size="md" showLabels={true} />
									</div>
								</div>
							)}
						</div>

						{/* フェーズ詳細 */}
						{scanProgress.phase && (
							<div className="bg-surface rounded-lg border border-border p-6">
								<h3 className="text-lg font-semibold text-text-primary mb-4">
									現在のフェーズ
								</h3>

								<div className="space-y-3">
									<div
										className={cn(
											"flex items-center gap-3 p-3 rounded-md border",
											scanProgress.phase === "discovery"
												? "bg-primary/10 border-primary/20"
												: "bg-surface-elevated",
										)}
									>
										<HardDrive
											className={cn(
												"h-5 w-5",
												scanProgress.phase === "discovery"
													? "text-primary"
													: "text-text-muted",
											)}
										/>
										<div>
											<div className="font-medium text-text-primary">
												ディレクトリ探索
											</div>
											<div className="text-sm text-text-secondary">
												ビデオファイルを検索中
											</div>
										</div>
									</div>

									<div
										className={cn(
											"flex items-center gap-3 p-3 rounded-md border",
											scanProgress.phase === "metadata"
												? "bg-primary/10 border-primary/20"
												: "bg-surface-elevated",
										)}
									>
										<Cpu
											className={cn(
												"h-5 w-5",
												scanProgress.phase === "metadata"
													? "text-primary"
													: "text-text-muted",
											)}
										/>
										<div>
											<div className="font-medium text-text-primary">
												メタデータ処理
											</div>
											<div className="text-sm text-text-secondary">
												ファイル情報を解析中
											</div>
										</div>
									</div>

									<div
										className={cn(
											"flex items-center gap-3 p-3 rounded-md border",
											scanProgress.phase === "database"
												? "bg-primary/10 border-primary/20"
												: "bg-surface-elevated",
										)}
									>
										<Database
											className={cn(
												"h-5 w-5",
												scanProgress.phase === "database"
													? "text-primary"
													: "text-text-muted",
											)}
										/>
										<div>
											<div className="font-medium text-text-primary">
												データベース更新
											</div>
											<div className="text-sm text-text-secondary">
												検索インデックスを構築中
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* ログ表示エリア（将来の拡張用） */}
						<div className="bg-surface rounded-lg border border-border p-6">
							<h3 className="text-lg font-semibold text-text-primary mb-4">
								スキャンログ
							</h3>
							<div className="bg-surface-elevated rounded-md p-4 font-mono text-sm text-text-secondary min-h-[200px]">
								{scanProgress.error ? (
									<div className="text-error">Error: {scanProgress.error}</div>
								) : scanProgress.message ? (
									<div className="text-text-primary">
										{new Date().toLocaleTimeString()}: {scanProgress.message}
									</div>
								) : (
									<div className="text-text-muted">
										スキャンログがここに表示されます...
									</div>
								)}
							</div>
						</div>
					</div>

					{/* サイドバー */}
					<div className="space-y-6">
						{/* 接続状態 */}
						<div className="bg-surface rounded-lg border border-border p-6">
							<h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
								<Wifi className="h-5 w-5" />
								接続状態
							</h3>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-text-secondary">リアルタイム通信</span>
									<div
										className={cn(
											"h-2 w-2 rounded-full",
											scanProgress.isConnected ? "bg-primary" : "bg-error",
										)}
									/>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-text-secondary">
										最後のハートビート
									</span>
									<span className="text-sm text-text-muted">
										{scanProgress.lastHeartbeat?.toLocaleTimeString() ?? "なし"}
									</span>
								</div>

								{scanProgress.connectionError && (
									<div className="text-error text-sm">
										{scanProgress.connectionError}
									</div>
								)}
							</div>

							{!scanProgress.isConnected && scanProgress.canReconnect && (
								<button
									type="button"
									onClick={scanProgress.reconnect}
									className="w-full mt-4 px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 text-sm"
								>
									再接続
								</button>
							)}
						</div>

						{/* スキャン統計 */}
						<div className="bg-surface rounded-lg border border-border p-6">
							<h3 className="text-lg font-semibold text-text-primary mb-4">
								統計情報
							</h3>

							<div className="space-y-3 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-text-secondary">スキャンID</span>
									<span className="font-mono text-text-muted text-xs">
										{scanProgress.scanId?.slice(-8) ?? "なし"}
									</span>
								</div>

								{scanProgress.totalFiles > 0 && (
									<>
										<div className="flex items-center justify-between">
											<span className="text-text-secondary">総ファイル数</span>
											<span className="font-mono text-text-primary">
												{scanProgress.totalFiles.toLocaleString()}
											</span>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-text-secondary">処理済み</span>
											<span className="font-mono text-text-primary">
												{scanProgress.processedFiles.toLocaleString()}
											</span>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-text-secondary">残り</span>
											<span className="font-mono text-text-primary">
												{(
													scanProgress.totalFiles - scanProgress.processedFiles
												).toLocaleString()}
											</span>
										</div>
									</>
								)}

								{scanProgress.completedAt && (
									<div className="flex items-center justify-between">
										<span className="text-text-secondary">完了時刻</span>
										<span className="text-primary text-sm">
											{scanProgress.completedAt.toLocaleString()}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
