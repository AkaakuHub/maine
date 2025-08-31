"use client";

import ManualRefreshButton from "@/components/ManualRefreshButton";
import { useVideoUpdater } from "@/hooks/useVideoUpdater";

export default function AdminPage() {
	const updateStatus = useVideoUpdater();

	return (
		<main className="min-h-screen bg-surface-variant">
			<div className="container mx-auto px-6 py-8">
				<div className="max-w-4xl mx-auto">
					{/* ナビゲーション */}
					<div className="flex items-center gap-4 mb-6">
						<a
							href="/"
							className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-all duration-200"
							title="メインページに戻る"
						>
							<svg
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>戻る</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 19l-7-7m0 0l7-7m-7 7h18"
								/>
							</svg>
							<span className="text-sm">戻る</span>
						</a>
					</div>

					<h1 className="text-3xl font-bold text-text mb-8">システム管理</h1>

					{/* 動画キャッシュ管理 */}
					<div className="bg-surface rounded-lg p-6 mb-6">
						<h2 className="text-xl font-semibold text-text mb-4">
							動画キャッシュ管理
						</h2>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-surface-elevated rounded-lg p-4">
									<div className="text-sm text-text-secondary mb-1">
										キャッシュ済みファイル数
									</div>
									<div className="text-2xl font-bold text-primary">
										{updateStatus.cacheSize?.toLocaleString() || 0}
									</div>
								</div>
								<div className="bg-surface-elevated rounded-lg p-4">
									<div className="text-sm text-text-secondary mb-1">
										最終更新
									</div>
									<div className="text-lg font-semibold text-text">
										{updateStatus.daysSince >= 0
											? `${updateStatus.daysSince}日前`
											: "未更新"}
									</div>
								</div>
								<div className="bg-surface-elevated rounded-lg p-4">
									<div className="text-sm text-text-secondary mb-1">
										更新状態
									</div>
									<div
										className={`text-lg font-semibold ${
											updateStatus.isUpdating
												? "text-primary"
												: updateStatus.needsUpdate
													? "text-warning"
													: "text-success"
										}`}
									>
										{updateStatus.isUpdating
											? "更新中..."
											: updateStatus.needsUpdate
												? "更新が必要"
												: "最新"}
									</div>
								</div>
							</div>

							{updateStatus.isUpdating && (
								<div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
									<div className="flex items-center gap-3 mb-2">
										<div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
										<span className="font-medium text-primary">
											キャッシュ更新中...
										</span>
									</div>
									<div className="bg-primary/20 rounded-full h-2">
										<div
											className="bg-primary h-2 rounded-full transition-all duration-300"
											style={{ width: `${updateStatus.progress}%` }}
										/>
									</div>
									<div className="text-sm text-primary mt-1">
										{updateStatus.progress}% 完了
									</div>
								</div>
							)}

							<div className="flex gap-4">
								<ManualRefreshButton />
								<button
									type="button"
									onClick={() => window.location.reload()}
									className="px-4 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text transition-colors"
								>
									ページを更新
								</button>
							</div>
						</div>
					</div>

					{/* システム情報 */}
					<div className="bg-surface rounded-lg p-6">
						<h2 className="text-xl font-semibold text-text mb-4">
							システム情報
						</h2>
						<div className="space-y-3 text-sm">
							<div className="flex justify-between py-2 border-b border-border">
								<span className="text-text-secondary">メモリ使用量</span>
								<span className="text-text font-mono">数KB (DB使用)</span>
							</div>
							<div className="flex justify-between py-2 border-b border-border">
								<span className="text-text-secondary">ストレージタイプ</span>
								<span className="text-text font-mono">SQLite + DBベース</span>
							</div>
							<div className="flex justify-between py-2 border-b border-border">
								<span className="text-text-secondary">HDD最適化</span>
								<span className="text-success font-mono">有効</span>
							</div>
							<div className="flex justify-between py-2">
								<span className="text-text-secondary">自動更新</span>
								<span className="text-text font-mono">
									週1回 (日曜 3:00 AM)
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
