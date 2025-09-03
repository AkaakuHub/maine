"use client";

import { useMemo } from "react";
import {
	CheckCircle,
	XCircle,
	Loader2,
	Wifi,
	WifiOff,
	AlertCircle,
} from "lucide-react";
import { cn } from "@/libs/utils";
import { useScanProgress } from "@/hooks/useScanProgress";

interface ScanProgressBarProps {
	className?: string;
	showDetails?: boolean;
}

/**
 * リアルタイムスキャン進捗表示コンポーネント
 *
 * SSEを通じてスキャン進捗をリアルタイム表示します
 */
export function ScanProgressBar({
	className,
	showDetails = true,
}: ScanProgressBarProps) {
	const scanProgress = useScanProgress();

	// 進捗バーの色とアイコンを決定
	const progressStyle = useMemo(() => {
		if (scanProgress.error) {
			return {
				bgColor: "bg-error",
				textColor: "text-error",
				icon: XCircle,
				pulse: false,
			};
		}

		if (scanProgress.isComplete) {
			return {
				bgColor: "bg-primary",
				textColor: "text-primary",
				icon: CheckCircle,
				pulse: false,
			};
		}

		if (scanProgress.isScanning) {
			return {
				bgColor: "bg-primary",
				textColor: "text-primary",
				icon: Loader2,
				pulse: true,
			};
		}

		return {
			bgColor: "bg-surface-elevated",
			textColor: "text-text-secondary",
			icon: null,
			pulse: false,
		};
	}, [scanProgress.error, scanProgress.isComplete, scanProgress.isScanning]);

	// フェーズ表示用のテキスト
	const phaseText = useMemo(() => {
		switch (scanProgress.phase) {
			case "discovery":
				return "ディレクトリ探索中";
			case "metadata":
				return "メタデータ処理中";
			case "database":
				return "データベース更新中";
			default:
				return null;
		}
	}, [scanProgress.phase]);

	// 接続状態が悪い場合は表示しない
	if (
		!scanProgress.isConnected &&
		!scanProgress.isScanning &&
		!scanProgress.isComplete
	) {
		return null;
	}

	return (
		<div className={cn("space-y-2", className)}>
			{/* 接続状態インジケーター */}
			{showDetails && (
				<div className="flex items-center gap-2 text-xs text-text-secondary">
					{scanProgress.isConnected ? (
						<Wifi className="h-3 w-3 text-primary" />
					) : (
						<WifiOff className="h-3 w-3 text-text-muted" />
					)}
					<span>
						{scanProgress.isConnected ? "リアルタイム接続中" : "オフライン"}
					</span>
					{scanProgress.connectionError && (
						<span className="text-error">({scanProgress.connectionError})</span>
					)}
				</div>
			)}

			{/* メイン進捗バー */}
			<div className="space-y-1">
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						{progressStyle.icon && (
							<progressStyle.icon
								className={cn(
									"h-4 w-4",
									progressStyle.textColor,
									progressStyle.pulse && "animate-spin",
								)}
							/>
						)}
						<span className={progressStyle.textColor}>
							{scanProgress.message ||
								(scanProgress.isScanning ? "スキャン中..." : "待機中")}
						</span>
					</div>

					{scanProgress.isScanning && (
						<span className="text-text-secondary tabular-nums">
							{Math.max(0, scanProgress.progress)}%
						</span>
					)}
				</div>

				{/* 進捗バー */}
				<div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
					<div
						className={cn(
							"h-full transition-all duration-300 ease-out",
							progressStyle.bgColor,
							progressStyle.pulse && "animate-pulse",
						)}
						style={{
							width: `${Math.max(0, Math.min(100, scanProgress.progress))}%`,
						}}
					/>
				</div>
			</div>

			{/* 詳細情報 */}
			{showDetails && (scanProgress.isScanning || scanProgress.isComplete) && (
				<div className="text-xs text-text-secondary space-y-1">
					{/* フェーズ情報 */}
					{phaseText && (
						<div className="flex items-center gap-2">
							<span className="font-medium">フェーズ:</span>
							<span>{phaseText}</span>
						</div>
					)}

					{/* ファイル進捗 */}
					{scanProgress.totalFiles > 0 && (
						<div className="flex items-center gap-2">
							<span className="font-medium">進捗:</span>
							<span className="tabular-nums">
								{scanProgress.processedFiles.toLocaleString()} /{" "}
								{scanProgress.totalFiles.toLocaleString()} ファイル
							</span>
						</div>
					)}

					{/* 現在処理中のファイル */}
					{scanProgress.currentFile && (
						<div className="flex items-center gap-2">
							<span className="font-medium">処理中:</span>
							<span className="truncate" title={scanProgress.currentFile}>
								{scanProgress.currentFile}
							</span>
						</div>
					)}

					{/* スキャンID */}
					{scanProgress.scanId && (
						<div className="flex items-center gap-2">
							<span className="font-medium">ID:</span>
							<span className="font-mono text-xs text-text-muted">
								{scanProgress.scanId}
							</span>
						</div>
					)}

					{/* エラー詳細 */}
					{scanProgress.error && (
						<div className="flex items-start gap-2 p-2 bg-error/10 border border-error/20 rounded">
							<AlertCircle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
							<div className="text-error text-xs">
								<div className="font-medium">エラーが発生しました</div>
								<div className="mt-1">{scanProgress.error}</div>
							</div>
						</div>
					)}

					{/* 完了情報 */}
					{scanProgress.isComplete && scanProgress.completedAt && (
						<div className="flex items-center gap-2 text-primary">
							<CheckCircle className="h-4 w-4" />
							<span>{scanProgress.completedAt.toLocaleTimeString()}に完了</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
