"use client";

import { useState } from "react";
import { Pause, Play, Square, Loader2 } from "lucide-react";
import { cn } from "@/libs/utils";
import { useScanProgress } from "@/hooks/useScanProgress";

interface ScanControlButtonsProps {
	className?: string;
	size?: "sm" | "md" | "lg";
	showLabels?: boolean;
}

/**
 * スキャン制御ボタンコンポーネント
 *
 * pause/resume/cancel機能を提供
 */
export function ScanControlButtons({
	className,
	size = "md",
	showLabels = true,
}: ScanControlButtonsProps) {
	const scanProgress = useScanProgress();
	const [loading, setLoading] = useState<string | null>(null);

	// ボタンサイズのスタイル
	const sizeStyles = {
		sm: "h-8 w-8 text-sm",
		md: "h-10 w-10 text-base",
		lg: "h-12 w-12 text-lg",
	};

	const iconSizeStyles = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	};

	// ボタン操作ハンドラー
	const handlePause = async () => {
		setLoading("pause");
		try {
			await scanProgress.pauseScan();
		} finally {
			setLoading(null);
		}
	};

	const handleResume = async () => {
		setLoading("resume");
		try {
			await scanProgress.resumeScan();
		} finally {
			setLoading(null);
		}
	};

	const handleCancel = async () => {
		setLoading("cancel");
		try {
			await scanProgress.cancelScan();
		} finally {
			setLoading(null);
		}
	};

	// スキャンが実行されていない場合は表示しない
	if (!scanProgress.isScanning && !scanProgress.isPaused) {
		return null;
	}

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{/* 一時停止/再開ボタン */}
			{scanProgress.isPaused ? (
				<button
					type="button"
					onClick={handleResume}
					disabled={!scanProgress.canResume || loading !== null}
					className={cn(
						"flex items-center justify-center rounded-full transition-colors",
						"bg-primary text-primary-foreground hover:bg-primary/90",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						sizeStyles[size],
					)}
					title="スキャンを再開"
				>
					{loading === "resume" ? (
						<Loader2 className={cn("animate-spin", iconSizeStyles[size])} />
					) : (
						<Play className={cn("ml-0.5", iconSizeStyles[size])} />
					)}
				</button>
			) : (
				<button
					type="button"
					onClick={handlePause}
					disabled={!scanProgress.canPause || loading !== null}
					className={cn(
						"flex items-center justify-center rounded-full transition-colors",
						"bg-warning text-warning-foreground hover:bg-warning/90",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						sizeStyles[size],
					)}
					title="スキャンを一時停止"
				>
					{loading === "pause" ? (
						<Loader2 className={cn("animate-spin", iconSizeStyles[size])} />
					) : (
						<Pause className={iconSizeStyles[size]} />
					)}
				</button>
			)}

			{/* キャンセルボタン */}
			<button
				type="button"
				onClick={handleCancel}
				disabled={!scanProgress.canCancel || loading !== null}
				className={cn(
					"flex items-center justify-center rounded-full transition-colors",
					"bg-error text-error-foreground hover:bg-error/90",
					"disabled:opacity-50 disabled:cursor-not-allowed",
					sizeStyles[size],
				)}
				title="スキャンをキャンセル"
			>
				{loading === "cancel" ? (
					<Loader2 className={cn("animate-spin", iconSizeStyles[size])} />
				) : (
					<Square className={iconSizeStyles[size]} />
				)}
			</button>

			{/* ラベル表示 */}
			{showLabels && (
				<div className="text-sm text-text-secondary ml-2">
					{scanProgress.isPaused ? (
						<span className="text-warning">一時停止中</span>
					) : (
						<span className="text-primary">実行中</span>
					)}
				</div>
			)}
		</div>
	);
}
