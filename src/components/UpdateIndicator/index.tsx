"use client";

import { useVideoUpdater } from "@/hooks/useVideoUpdater";

export default function UpdateIndicator() {
	const updateStatus = useVideoUpdater();

	// データがロードされるまで何も表示しない
	if (!updateStatus.isLoaded) {
		return null;
	}

	// 更新中でない場合は何も表示しない（1週間経過していれば自動で更新開始されるため）
	if (!updateStatus.isUpdating) {
		return null;
	}

	// 自動更新中の表示（1週間経過による強制更新も手動更新も同じ表示）
	return (
		<div className="fixed top-4 right-4 bg-warning text-text-inverse px-4 py-3 rounded-xl shadow-xl z-50 max-w-sm">
			<div className="flex items-start gap-3">
				<div className="w-8 h-8 bg-surface-variant/20 rounded-lg flex items-center justify-center flex-shrink-0">
					<div className="animate-spin w-4 h-4 border-2 border-text-inverse border-t-transparent rounded-full" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-medium">
						{updateStatus.daysSince >= 7
							? "ファイル一覧が古いため更新中..."
							: "ファイル一覧を更新中..."}
					</div>
					<div className="text-sm opacity-90 mt-1">
						{updateStatus.daysSince >= 7
							? `${updateStatus.daysSince} 日経過のため自動更新を実行中`
							: `新しいファイルをスキャンしています (${updateStatus.progress}%)`}
					</div>
				</div>
			</div>

			<div className="mt-3 bg-surface-variant/20 rounded-full h-2">
				<div
					className="bg-text-inverse h-2 rounded-full transition-all duration-300"
					style={{ width: `${updateStatus.progress}%` }}
				/>
			</div>

			<div className="mt-1 text-xs opacity-75">
				{updateStatus.daysSince >= 7
					? "更新をキャンセルすることはできません"
					: `現在 ${updateStatus.cacheSize.toLocaleString()} ファイルをキャッシュ中`}
			</div>
		</div>
	);
}
