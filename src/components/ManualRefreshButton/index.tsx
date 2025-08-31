"use client";

import { useState } from "react";

export default function ManualRefreshButton() {
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		if (
			confirm("フルキャッシュ更新を実行しますか？（数分かかる場合があります）")
		) {
			setIsRefreshing(true);
			try {
				const response = await fetch("/api/admin/manual-refresh", {
					method: "POST",
				});

				if (response.ok) {
					const data = await response.json();
					alert(`更新完了: ${data.totalFiles?.toLocaleString() || 0}ファイル`);
					window.location.reload();
				} else {
					throw new Error("更新に失敗しました");
				}
			} catch (error) {
				alert(
					`更新に失敗しました: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
			} finally {
				setIsRefreshing(false);
			}
		}
	};

	return (
		<button
			type="button"
			onClick={handleRefresh}
			disabled={isRefreshing}
			className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error-hover disabled:bg-primary-disabled text-text-inverse rounded-lg transition-colors"
		>
			{isRefreshing && (
				<div className="animate-spin w-4 h-4 border-2 border-text-inverse border-t-transparent rounded-full" />
			)}
			{isRefreshing ? "フル更新中..." : "手動フル更新"}
		</button>
	);
}
