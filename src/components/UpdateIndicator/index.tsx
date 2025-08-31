"use client";

import { useVideoUpdater } from "@/hooks/useVideoUpdater";

export default function UpdateIndicator() {
	const updateStatus = useVideoUpdater();

	if (!updateStatus.isUpdating && updateStatus.daysSince < 7) {
		return null; // 1週間未満なら何も表示しない
	}

	if (updateStatus.isUpdating) {
		return (
			<div className="fixed top-4 right-4 bg-primary text-text-inverse px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
				<div className="flex items-center gap-3">
					<div className="animate-spin w-5 h-5 border-2 border-text-inverse border-t-transparent rounded-full" />
					<div>
						<div className="font-medium">ファイル一覧を更新中...</div>
						<div className="text-sm opacity-90">
							新しいファイルをスキャンしています ({updateStatus.progress}%)
						</div>
					</div>
				</div>

				<div className="mt-2 bg-primary-hover rounded-full h-2">
					<div
						className="bg-surface h-2 rounded-full transition-all duration-300"
						style={{ width: `${updateStatus.progress}%` }}
					/>
				</div>

				<div className="mt-1 text-xs opacity-75">
					現在 {updateStatus.cacheSize.toLocaleString()} ファイルをキャッシュ中
				</div>
			</div>
		);
	}

	// 1週間経過している場合の警告表示
	return (
		<div className="fixed top-4 right-4 bg-warning text-text-inverse px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
			<div className="flex items-center gap-3">
				<div className="w-5 h-5 text-warning-hover">⚠️</div>
				<div>
					<div className="font-medium">ファイル一覧が古い可能性があります</div>
					<div className="text-sm opacity-90">
						最終更新から {updateStatus.daysSince} 日経過
					</div>
				</div>
			</div>

			<button
				type="button"
				onClick={() => fetch("/api/admin/manual-refresh", { method: "POST" })}
				className="mt-2 w-full bg-warning-hover hover:bg-warning px-3 py-1 rounded text-sm"
			>
				今すぐ更新
			</button>
		</div>
	);
}
